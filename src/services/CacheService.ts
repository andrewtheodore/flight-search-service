import NodeCache from 'node-cache';
import { FlightSearchRequest, AggregatedSearchResponse } from '../models';

export class CacheService {
  private cache: NodeCache;

  constructor(ttlSeconds: number = 300) {
    this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: 60 });
  }

  generateCacheKey(request: FlightSearchRequest): string {
    return `search:${request.origin}:${request.destination}:${request.departureDate}:${
      request.returnDate || 'oneway'
    }:${request.passengers}:${request.cabinClass || 'economy'}`;
  }

  get(request: FlightSearchRequest): AggregatedSearchResponse | undefined {
    const key = this.generateCacheKey(request);
    return this.cache.get<AggregatedSearchResponse>(key);
  }

  set(request: FlightSearchRequest, response: AggregatedSearchResponse): void {
    const key = this.generateCacheKey(request);
    this.cache.set(key, response);
  }

  delete(request: FlightSearchRequest): void {
    const key = this.generateCacheKey(request);
    this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }
}
