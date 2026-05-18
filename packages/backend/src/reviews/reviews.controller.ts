import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('traveler')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a review for a completed booking (traveler only)' })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or review window expired' })
  @ApiResponse({ status: 409, description: 'Review already submitted for this booking' })
  async create(@Req() req: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(req.user.id, dto);
  }

  @Post(':id/flag')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Flag a review for moderation' })
  @ApiResponse({ status: 204, description: 'Review flagged' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async flag(@Param('id') id: string, @Req() req: any) {
    await this.reviewsService.flagReview(id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a review (admin only)' })
  @ApiResponse({ status: 204, description: 'Review removed' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.reviewsService.removeReview(id, req.user.id);
  }
}

@ApiTags('experiences')
@Controller('experiences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExperienceReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':id/reviews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated reviews for an experience' })
  @ApiResponse({ status: 200, description: 'Reviews returned with total count' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getExperienceReviews(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    return this.reviewsService.getExperienceReviews(id, parseInt(page, 10), parseInt(pageSize, 10));
  }
}

@ApiTags('guides')
@Controller('guides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GuideReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':id/reviews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all published reviews for a guide's experiences" })
  @ApiResponse({ status: 200, description: 'Reviews returned' })
  async getGuideReviews(@Param('id') id: string) {
    return this.reviewsService.getGuideReviews(id);
  }
}
