import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { TripPlannerService } from './trip-planner.service';
import { ParseTripRequestDto } from './dto/parse-trip-request.dto';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { ModifyItineraryDto } from './dto/modify-itinerary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('trip-planner')
@Controller('trip-planner')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TripPlannerController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse natural language trip request into structured parameters' })
  @ApiResponse({ status: 200, description: 'Trip parameters extracted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async parseRequest(@Req() req: any, @Body() dto: ParseTripRequestDto) {
    return this.tripPlannerService.parseRequest({
      userId: req.user.id,
      naturalLanguageInput: dto.naturalLanguageInput,
      timestamp: new Date(),
    });
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a personalized itinerary from trip parameters' })
  @ApiResponse({ status: 201, description: 'Itinerary generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateItinerary(@Req() req: any, @Body() dto: GenerateItineraryDto) {
    return this.tripPlannerService.generateItinerary(req.user.id, dto.parameters);
  }

  @Get('itineraries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the authenticated user's saved itineraries" })
  @ApiResponse({ status: 200, description: 'Itineraries returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserItineraries(@Req() req: any) {
    return this.tripPlannerService.getUserItineraries(req.user.id);
  }

  @Get('itineraries/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific itinerary by ID' })
  @ApiResponse({ status: 200, description: 'Itinerary returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Itinerary not found' })
  async getItinerary(@Param('id') id: string, @Req() req: any) {
    return this.tripPlannerService.getItinerary(id, req.user.id);
  }

  @Put('itineraries/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify an existing itinerary using natural language' })
  @ApiResponse({ status: 200, description: 'Itinerary modified successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Itinerary not found' })
  async modifyItinerary(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ModifyItineraryDto,
  ) {
    return this.tripPlannerService.modifyItinerary(id, req.user.id, dto.modification);
  }
}
