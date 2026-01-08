import express, { Express } from 'express';
import { APP_CONFIG, SUPPLIER_CONFIGS } from './config';
import { SearchOrchestrator } from './services/SearchOrchestrator';
import { RateLimiter } from './services/RateLimiter';
import { CircuitBreaker } from './services/CircuitBreaker';
import { QuotaManager } from './services/QuotaManager';
import { CacheService } from './services/CacheService';
import { CitilinkAdapter } from './adapters/CitilinkAdapter';
import { GarudaAdapter } from './adapters/GarudaAdapter';
import { LionAirAdapter } from './adapters/LionAirAdapter';
import { createSearchRoutes } from './routes';
import { ISupplierAdapter } from './adapters/SupplierAdapter';

export class FlightSearchApp {
  private app: Express;
  private orchestrator: SearchOrchestrator;
  private quotaManager: QuotaManager;
  private cacheService: CacheService;

  constructor() {
    this.app = express();
    this.quotaManager = new QuotaManager();
    this.cacheService = new CacheService(APP_CONFIG.cacheTTL);
    this.orchestrator = new SearchOrchestrator(this.quotaManager, this.cacheService);

    this.setupMiddleware();
    this.setupSuppliers();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupSuppliers(): void {
    // Create adapter instances with different latencies
    const adapters: { [key: string]: ISupplierAdapter } = {
      Citilink: new CitilinkAdapter('http://api.citilink.example.com', 800),
      Garuda: new GarudaAdapter('http://api.garuda.example.com', 600),
      LionAir: new LionAirAdapter('http://api.lionair.example.com', 400),
    };

    // Register suppliers with their configurations
    for (const config of SUPPLIER_CONFIGS) {
      const adapter = adapters[config.name];
      if (!adapter) continue;

      const rateLimiter = new RateLimiter();
      rateLimiter.setLimit(config.name, config.rateLimit);

      const circuitBreaker = new CircuitBreaker(
        config.circuitBreakerThreshold,
        config.circuitBreakerTimeout,
        config.name
      );

      this.quotaManager.setRequiredRatio(config.name, config.requiredSearchToBookRatio);

      this.orchestrator.registerSupplier(adapter, rateLimiter, circuitBreaker, config.timeout);

      console.log(`Registered supplier: ${config.name}`);
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // API routes
    this.app.use('/api/v1', createSearchRoutes(this.orchestrator, this.quotaManager));

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  public start(): void {
    const port = APP_CONFIG.port;
    this.app.listen(port, () => {
      console.log(`Flight Search Service running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Available endpoints:');
      console.log('  GET  /health');
      console.log('  POST /api/v1/search');
      console.log('  POST /api/v1/book');
      console.log('  GET  /api/v1/suppliers/status');
    });
  }

  public getApp(): Express {
    return this.app;
  }
}
