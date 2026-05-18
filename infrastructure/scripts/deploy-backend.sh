#!/bin/bash
# Deploy backend services to AWS ECS
set -e

AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-tourism-marketplace/backend}"
ECS_CLUSTER="${ECS_CLUSTER:-tourism-marketplace}"
ECS_SERVICE="${ECS_SERVICE:-tourism-marketplace-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "=== Tourism Marketplace Backend Deployment ==="
echo "Region: $AWS_REGION"
echo "Image tag: $IMAGE_TAG"

# Get ECR login
echo "Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com"

ECR_URI="$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

# Build Docker image
echo "Building Docker image..."
docker build -t "$ECR_REPO:$IMAGE_TAG" -f packages/backend/Dockerfile .

# Tag and push
echo "Pushing image to ECR..."
docker tag "$ECR_REPO:$IMAGE_TAG" "$ECR_URI:$IMAGE_TAG"
docker push "$ECR_URI:$IMAGE_TAG"

# Run database migrations
echo "Running database migrations..."
aws ecs run-task \
  --cluster "$ECS_CLUSTER" \
  --task-definition "tourism-marketplace-migrations" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(aws ec2 describe-subnets --filters 'Name=tag:Name,Values=private-subnet-*' --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')],securityGroups=[$(aws ec2 describe-security-groups --filters 'Name=group-name,Values=tourism-marketplace-backend-sg' --query 'SecurityGroups[0].GroupId' --output text)]}" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["node","packages/backend/dist/main.js","--migrate"]}]}' \
  --region "$AWS_REGION" || echo "Migration task not configured, skipping..."

# Update ECS service
echo "Updating ECS service..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --region "$AWS_REGION"

# Wait for deployment to complete
echo "Waiting for deployment to stabilize..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION"

echo "=== Deployment complete! ==="

# Verify health check
echo "Verifying health check..."
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "tourism-marketplace-alb" \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region "$AWS_REGION")

curl -f "https://$ALB_DNS/health" && echo "Health check passed!" || echo "Health check failed!"
