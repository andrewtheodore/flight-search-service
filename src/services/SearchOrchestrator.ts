import { ISupplierAdapter } from '../adapters/SupplierAdapter';
import {
  FlightSearchRequest,
  FlightSearchResponse,
  AggregatedSearchResponse,
  Flight,
} from '../models';
import { RateLimiter } from './RateLimiter';
import { CircuitBreaker } from './CircuitBreaker';
import { QuotaManager } from './QuotaManager';
import { CacheService } from './CacheService';
import { APP_CONFIG } from '../config';

interface SupplierWrapper {
  adapter: ISupplierAdapter;
  rateLimiter: RateLimiter;
  circuitBreaker: CircuitBreaker;
  config: {
    timeout: number;
  };
}

export class SearchOrchestrator {
  private suppliers: Map<string, SupplierWrapper> = new Map();
  private quotaManager: QuotaManager;
  private cacheService: CacheService;
  private metrics: Map<string, { totalCalls: number; totalLatency: number }> = new Map();

  constructor(quotaManager: QuotaManager, cacheService: CacheService) {
    this.quotaManager = quotaManager;
    this.cacheService = cacheService;
  }

  registerSupplier(
    adapter: ISupplierAdapter,
    rateLimiter: RateLimiter,
    circuitBreaker: CircuitBreaker,
    timeout: number
  ): void {
    const supplierName = adapter.getName();
    this.suppliers.set(supplierName, {
      adapter,
      rateLimiter,
      circuitBreaker,
      config: { timeout },
    });

    // Initialize metrics
    this.metrics.set(supplierName, { totalCalls: 0, totalLatency: 0 });
  }

  async search(request: FlightSearchRequest): Promise<AggregatedSearchResponse> {
    const startTime = Date.now();

    // Check cache first
    if (APP_CONFIG.cacheEnabled) {
      const cached = this.cacheService.get(request);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    // Select suppliers based on quota health
    const availableSuppliers = this.selectSuppliers();

    if (availableSuppliers.length === 0) {
      return {
        flights: [],
        suppliers: [],
        totalResults: 0,
        responseTime: Date.now() - startTime,
        cached: false,
      };
    }

    // Create promises for all suppliers
    const searchPromises = availableSuppliers.map((supplier) =>
      this.searchSupplier(supplier, request)
    );

    // Wait for first response (1 second timeout)
    const firstResponse = await this.waitForFirstResponse(
      searchPromises,
      APP_CONFIG.firstResponseTimeout
    );

    // Continue collecting responses up to max timeout
    const allResponses = await this.collectAllResponses(
      searchPromises,
      APP_CONFIG.maxResponseTimeout - (Date.now() - startTime)
    );

    // Aggregate results
    const aggregated = this.aggregateResponses(allResponses, Date.now() - startTime);

    // Cache the result
    if (APP_CONFIG.cacheEnabled && aggregated.flights.length > 0) {
      this.cacheService.set(request, aggregated);
    }

    return aggregated;
  }

  private selectSuppliers(): SupplierWrapper[] {
    const suppliers: SupplierWrapper[] = [];

    for (const [name, wrapper] of this.suppliers.entries()) {
      // Skip if circuit breaker is open
      if (wrapper.circuitBreaker.getState() === 'open') {
        continue;
      }

      // Skip if quota is unhealthy
      if (!this.quotaManager.isQuotaHealthy(name)) {
        continue;
      }

      suppliers.push(wrapper);
    }

    // Sort by quota score (higher is better)
    suppliers.sort((a, b) => {
      const scoreA = this.quotaManager.getQuotaScore(a.adapter.getName());
      const scoreB = this.quotaManager.getQuotaScore(b.adapter.getName());
      return scoreB - scoreA;
    });

    return suppliers;
  }

  private async searchSupplier(
    supplier: SupplierWrapper,
    request: FlightSearchRequest
  ): Promise<FlightSearchResponse | null> {
    const supplierName = supplier.adapter.getName();
    const startTime = Date.now();

    try {
      // Check rate limit
      const hasToken = await supplier.rateLimiter.acquire(supplierName);
      if (!hasToken) {
        console.log(`Rate limit exceeded for ${supplierName}`);
        return null;
      }

      // Increment search count for quota tracking
      this.quotaManager.incrementSearchCount(supplierName);

      // Execute with circuit breaker and timeout
      const result = await supplier.circuitBreaker.execute(async () => {
        return await this.withTimeout(
          supplier.adapter.search(request),
          supplier.config.timeout
        );
      });

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(supplierName, latency);

      return result;
    } catch (error) {
      console.error(`Error searching ${supplierName}:`, error);
      return null;
    }
  }

  private async waitForFirstResponse(
    promises: Promise<FlightSearchResponse | null>[],
    timeout: number
  ): Promise<FlightSearchResponse | null> {
    return Promise.race([
      ...promises,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout)),
    ]);
  }

  private async collectAllResponses(
    promises: Promise<FlightSearchResponse | null>[],
    remainingTimeout: number
  ): Promise<FlightSearchResponse[]> {
    const timeoutPromise = new Promise<FlightSearchResponse[]>((resolve) =>
      setTimeout(() => resolve([]), Math.max(0, remainingTimeout))
    );

    const allSettled = Promise.allSettled(promises).then((results) => {
      return results
        .filter((r) => r.status === 'fulfilled' && r.value !== null)
        .map((r) => (r as PromiseFulfilledResult<FlightSearchResponse>).value);
    });

    return Promise.race([allSettled, timeoutPromise]);
  }

  private aggregateResponses(
    responses: FlightSearchResponse[],
    responseTime: number
  ): AggregatedSearchResponse {
    const allFlights: Flight[] = [];
    const suppliers: string[] = [];

    for (const response of responses) {
      suppliers.push(response.supplier);
      allFlights.push(...response.flights);
    }

    // Sort flights by price
    allFlights.sort((a, b) => a.price - b.price);

    return {
      flights: allFlights,
      suppliers,
      totalResults: allFlights.length,
      responseTime,
      cached: false,
    };
  }

  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  }

  private updateMetrics(supplierName: string, latency: number): void {
    const metrics = this.metrics.get(supplierName);
    if (metrics) {
      metrics.totalCalls++;
      metrics.totalLatency += latency;
    }
  }

  getAverageLatency(supplierName: string): number {
    const metrics = this.metrics.get(supplierName);
    if (!metrics || metrics.totalCalls === 0) return 0;
    return metrics.totalLatency / metrics.totalCalls;
  }

  getSupplierNames(): string[] {
    return Array.from(this.suppliers.keys());
  }

  getSupplierWrapper(name: string): SupplierWrapper | undefined {
    return this.suppliers.get(name);
  }
}
