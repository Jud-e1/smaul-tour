#!/bin/bash
# Deploy Next.js web application
set -e

ENVIRONMENT="${ENVIRONMENT:-production}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.tourismmarketplace.com}"

echo "=== Tourism Marketplace Web Deployment ==="
echo "Environment: $ENVIRONMENT"

# Install dependencies
echo "Installing dependencies..."
npm ci --workspace=packages/web

# Build Next.js application
echo "Building Next.js application..."
NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  npm run build --workspace=packages/web

echo "Build complete!"

# Deploy to Vercel (if using Vercel)
if command -v vercel &> /dev/null; then
  echo "Deploying to Vercel..."
  cd packages/web
  if [ "$ENVIRONMENT" = "production" ]; then
    vercel --prod --yes
  else
    vercel --yes
  fi
  cd ../..
  echo "Vercel deployment complete!"
fi

echo "=== Web deployment complete! ==="
