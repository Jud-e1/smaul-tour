import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExperienceService } from './experiences.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { AvailabilitySlotDto } from './dto/availability-slot.dto';
import { SearchExperienceDto } from './dto/search-experience.dto';
import { ExperienceSearchQuery } from './interfaces/experience.interfaces';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('experiences')
@Controller('experiences')
export class ExperiencesController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new experience (guide only)' })
  @ApiResponse({ status: 201, description: 'Experience created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - guide role required' })
  async create(@Req() req: any, @Body() dto: CreateExperienceDto) {
    return this.experienceService.createExperience(req.user.id, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and list experiences (public)' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(@Query() query: SearchExperienceDto) {
    const searchQuery: ExperienceSearchQuery = {
      text: query.text,
      categories: query.categories,
      priceRange:
        query.minPrice !== undefined || query.maxPrice !== undefined
          ? { min: query.minPrice ?? 0, max: query.maxPrice ?? Number.MAX_SAFE_INTEGER }
          : undefined,
      durationRange:
        query.minDuration !== undefined || query.maxDuration !== undefined
          ? { min: query.minDuration ?? 0, max: query.maxDuration ?? Number.MAX_SAFE_INTEGER }
          : undefined,
      location:
        query.lat !== undefined && query.lng !== undefined && query.radiusKm !== undefined
          ? { lat: query.lat, lng: query.lng, radiusKm: query.radiusKm }
          : undefined,
      minRating: query.minRating,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      pageSize: query.pageSize,
    };
    return this.experienceService.searchExperiences(searchQuery);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an experience by ID (public)' })
  @ApiResponse({ status: 200, description: 'Experience found' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async getOne(@Param('id') id: string) {
    return this.experienceService.getExperience(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an experience (guide, own only)' })
  @ApiResponse({ status: 200, description: 'Experience updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - guide role required' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateExperienceDto) {
    return this.experienceService.updateExperience(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an experience (guide, own only)' })
  @ApiResponse({ status: 204, description: 'Experience deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - guide role required' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete experience with active bookings' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.experienceService.deleteExperience(id, req.user.id);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an image for an experience (guide only)' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  @ApiResponse({ status: 409, description: 'Maximum image limit reached' })
  async uploadImage(@Param('id') id: string, @Req() req: any, @UploadedFile() file: any) {
    return this.experienceService.uploadImage(id, req.user.id, file);
  }

  @Put(':id/images/:imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set primary image for an experience (guide only)' })
  @ApiResponse({ status: 200, description: 'Primary image updated' })
  @ApiResponse({ status: 404, description: 'Experience or image not found' })
  async setPrimaryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Req() req: any
  ) {
    return this.experienceService.setPrimaryImage(id, req.user.id, imageId);
  }

  @Get('recommendations/personalized')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get personalized experience recommendations for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Personalized recommendations returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPersonalizedRecommendations(@Req() req: any) {
    return this.experienceService.getPersonalizedRecommendations(req.user.id, 10);
  }

  @Get(':id/recommendations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recommended experiences similar to a given one (public)' })
  @ApiResponse({ status: 200, description: 'Recommendations returned' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async getRecommendations(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.experienceService.getRecommendations(id, limit ? Number(limit) : 5);
  }

  @Post('travel-times')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate travel times between a list of locations (public)' })
  @ApiResponse({ status: 200, description: 'Travel times returned' })
  async calculateTravelTimes(
    @Body() body: { locations: Array<{ id: string; lat: number; lng: number }> }
  ) {
    return this.experienceService.calculateTravelTimes(body.locations);
  }

  @Get(':id/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get availability calendar for an experience (public)' })
  @ApiResponse({ status: 200, description: 'Availability calendar returned' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async getAvailability(@Param('id') id: string) {
    return this.experienceService.getAvailability(id);
  }

  @Put(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update availability calendar for an experience (guide only)' })
  @ApiResponse({ status: 200, description: 'Availability calendar updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - guide role required' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async updateAvailability(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { slots: AvailabilitySlotDto[] }
  ) {
    return this.experienceService.updateAvailability(id, req.user.id, body.slots);
  }
}
