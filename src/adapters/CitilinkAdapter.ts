import { BaseSupplierAdapter } from './SupplierAdapter';
import { FlightSearchRequest, FlightSearchResponse, Flight } from '../models';
import { v4 as uuidv4 } from 'uuid';

export class CitilinkAdapter extends BaseSupplierAdapter {
  private latency: number;

  constructor(baseUrl: string, latency: number = 800) {
    super('Citilink', baseUrl);
    this.latency = latency;
  }

  async search(request: FlightSearchRequest): Promise<FlightSearchResponse> {
    // Simulate network latency
    await this.delay(this.latency);

    // Mock response - in real implementation, this would call the actual API
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
    const basePrice = 150 + Math.random() * 300;

    for (let i = 0; i < 3; i++) {
      flights.push({
        flightNumber: `CT${1000 + i}`,
        airline: this.name,
        origin: request.origin,
        destination: request.destination,
        departureTime: new Date(request.departureDate).toISOString(),
        arrivalTime: new Date(
          new Date(request.departureDate).getTime() + (2 + i) * 60 * 60 * 1000
        ).toISOString(),
        price: basePrice + i * 50,
        currency: 'USD',
        availableSeats: 50 + Math.floor(Math.random() * 100),
      });
    }

    return flights;
  }
}
