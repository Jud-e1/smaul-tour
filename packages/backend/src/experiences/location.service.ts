import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DistanceResult {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  distanceKm: number;
  durationMinutes: number;
}

export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY', '');
  }

  /**
   * Calculate straight-line distance between two coordinates using Haversine formula.
   * Used as a fallback when Google Maps API is not configured.
   */
  calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get distance and estimated travel time between two points.
   * Uses Google Maps Distance Matrix API if configured, falls back to Haversine.
   * TODO: Enable Google Maps API by setting GOOGLE_MAPS_API_KEY in environment
   */
  async getDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<DistanceResult> {
    if (this.apiKey) {
      try {
        const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
        const response = await axios.get(url, {
          params: {
            origins: `${fromLat},${fromLng}`,
            destinations: `${toLat},${toLng}`,
            key: this.apiKey,
          },
        });
        const element = response.data?.rows?.[0]?.elements?.[0];
        if (element?.status === 'OK') {
          return {
            fromLat, fromLng, toLat, toLng,
            distanceKm: element.distance.value / 1000,
            durationMinutes: Math.ceil(element.duration.value / 60),
          };
        }
      } catch (err) {
        this.logger.warn('Google Maps API call failed, falling back to Haversine', err);
      }
    }

    // Fallback: Haversine distance, estimate 30 km/h average speed
    const distanceKm = this.calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
    return {
      fromLat, fromLng, toLat, toLng,
      distanceKm,
      durationMinutes: Math.ceil((distanceKm / 30) * 60),
    };
  }

  /**
   * Calculate distances between consecutive locations in the list.
   */
  async calculateTravelTimes(
    locations: Array<{ id: string; lat: number; lng: number }>,
  ): Promise<Array<{ fromId: string; toId: string; distanceKm: number; durationMinutes: number }>> {
    const results: Array<{ fromId: string; toId: string; distanceKm: number; durationMinutes: number }> = [];
    for (let i = 0; i < locations.length - 1; i++) {
      const from = locations[i];
      const to = locations[i + 1];
      const dist = await this.getDistance(from.lat, from.lng, to.lat, to.lng);
      results.push({
        fromId: from.id,
        toId: to.id,
        distanceKm: dist.distanceKm,
        durationMinutes: dist.durationMinutes,
      });
    }
    return results;
  }
}
