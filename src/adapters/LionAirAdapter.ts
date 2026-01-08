import { BaseSupplierAdapter } from './SupplierAdapter';
import { FlightSearchRequest, FlightSearchResponse, Flight } from '../models';
import { v4 as uuidv4 } from 'uuid';

export class LionAirAdapter extends BaseSupplierAdapter {
  private latency: number;

  constructor(baseUrl: string, latency: number = 400) {
    super('LionAir', baseUrl);
    this.latency = latency;
  }

  async search(request: FlightSearchRequest): Promise<FlightSearchResponse> {
    await this.delay(this.latency);

    const flights: Flight[] = this.generateMockFlights(request);

    return {
      supplier: this.name,
      flights,
      searchId: uuidv4(),
      timestamp: Date.now(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateMockFlights(request: FlightSearchRequest): Flight[] {
    const flights: Flight[] = [];
    const basePrice = 100 + Math.random() * 250;

    for (let i = 0; i < 5; i++) {
      flights.push({
        flightNumber: `JT${3000 + i}`,
        airline: this.name,
        origin: request.origin,
        destination: request.destination,
        departureTime: new Date(request.departureDate).toISOString(),
        arrivalTime: new Date(
          new Date(request.departureDate).getTime() + (2 + i) * 60 * 60 * 1000
        ).toISOString(),
        price: basePrice + i * 30,
        currency: 'USD',
        availableSeats: 60 + Math.floor(Math.random() * 120),
      });
    }

    return flights;
  }
}
