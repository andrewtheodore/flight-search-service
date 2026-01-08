import { FlightSearchRequest, FlightSearchResponse } from '../models';

export interface ISupplierAdapter {
  search(request: FlightSearchRequest): Promise<FlightSearchResponse>;
  getName(): string;
  isHealthy(): boolean;
}

export abstract class BaseSupplierAdapter implements ISupplierAdapter {
  protected name: string;
  protected baseUrl: string;
  protected healthy: boolean = true;

  constructor(name: string, baseUrl: string) {
    this.name = name;
    this.baseUrl = baseUrl;
  }

  abstract search(request: FlightSearchRequest): Promise<FlightSearchResponse>;

  getName(): string {
    return this.name;
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  protected setHealthy(healthy: boolean): void {
    this.healthy = healthy;
  }
}
