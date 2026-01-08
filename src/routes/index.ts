import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { SearchOrchestrator } from '../services/SearchOrchestrator';
import { QuotaManager } from '../services/QuotaManager';
import { FlightSearchRequest, BookingRequest, SupplierStatus } from '../models';

export function createSearchRoutes(
  orchestrator: SearchOrchestrator,
  quotaManager: QuotaManager
): Router {
  const router = Router();

  // POST /api/v1/search - Flight search endpoint
  router.post(
    '/search',
    [
      body('origin').isString().notEmpty().withMessage('Origin is required'),
      body('destination').isString().notEmpty().withMessage('Destination is required'),
      body('departureDate').isISO8601().withMessage('Valid departure date is required'),
      body('returnDate').optional().isISO8601().withMessage('Return date must be valid'),
      body('passengers').isInt({ min: 1 }).withMessage('At least 1 passenger required'),
      body('cabinClass')
        .optional()
        .isIn(['economy', 'business', 'first'])
        .withMessage('Invalid cabin class'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const searchRequest: FlightSearchRequest = req.body;
        const result = await orchestrator.search(searchRequest);

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // POST /api/v1/book - Booking endpoint
  router.post(
    '/book',
    [
      body('searchId').isString().notEmpty().withMessage('Search ID is required'),
      body('flightNumber').isString().notEmpty().withMessage('Flight number is required'),
      body('supplier').isString().notEmpty().withMessage('Supplier is required'),
      body('passengers').isArray({ min: 1 }).withMessage('At least 1 passenger required'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const bookingRequest: BookingRequest = req.body;

        // Increment booking count for quota tracking
        quotaManager.incrementBookingCount(bookingRequest.supplier);

        // Mock booking response - in real implementation, this would call supplier booking API
        const response = {
          bookingId: `BK${Date.now()}`,
          status: 'confirmed',
          flightNumber: bookingRequest.flightNumber,
          supplier: bookingRequest.supplier,
          totalPrice: 500,
          currency: 'USD',
        };

        res.json({
          success: true,
          data: response,
        });
      } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // GET /api/v1/suppliers/status - Supplier health/quota status
  router.get('/suppliers/status', async (req: Request, res: Response) => {
    try {
      const supplierNames = orchestrator.getSupplierNames();
      const statuses: SupplierStatus[] = [];

      for (const name of supplierNames) {
        const wrapper = orchestrator.getSupplierWrapper(name);
        if (!wrapper) continue;

        const searchCount = quotaManager.getSearchCount(name);
        const bookingCount = quotaManager.getBookingCount(name);
        const ratio = quotaManager.getSearchToBookRatio(name);

        statuses.push({
          name,
          isHealthy: wrapper.adapter.isHealthy() && quotaManager.isQuotaHealthy(name),
          averageLatency: orchestrator.getAverageLatency(name),
          requestsPerMinute: wrapper.rateLimiter.getAvailableTokens(name),
          rateLimit: wrapper.rateLimiter.getRateLimit(name),
          searchCount,
          bookingCount,
          searchToBookRatio: ratio === Infinity ? -1 : ratio,
          requiredRatio: quotaManager.getRequiredRatio(name),
          circuitBreakerStatus: wrapper.circuitBreaker.getState(),
        });
      }

      res.json({
        success: true,
        data: statuses,
      });
    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  return router;
}
