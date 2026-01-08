import { QuotaManager } from '../services/QuotaManager';

describe('QuotaManager', () => {
  let quotaManager: QuotaManager;

  beforeEach(() => {
    quotaManager = new QuotaManager();
  });

  test('should track search and booking counts', () => {
    quotaManager.incrementSearchCount('supplier1');
    quotaManager.incrementSearchCount('supplier1');
    quotaManager.incrementBookingCount('supplier1');

    expect(quotaManager.getSearchCount('supplier1')).toBe(2);
    expect(quotaManager.getBookingCount('supplier1')).toBe(1);
  });

  test('should calculate search-to-book ratio', () => {
    quotaManager.incrementSearchCount('supplier1');
    quotaManager.incrementSearchCount('supplier1');
    quotaManager.incrementSearchCount('supplier1');
    quotaManager.incrementBookingCount('supplier1');

    expect(quotaManager.getSearchToBookRatio('supplier1')).toBe(3);
  });

  test('should return Infinity ratio when no bookings', () => {
    quotaManager.incrementSearchCount('supplier1');

    expect(quotaManager.getSearchToBookRatio('supplier1')).toBe(Infinity);
  });

  test('should check quota health based on ratio', () => {
    quotaManager.setRequiredRatio('supplier1', 100);

    // Within healthy range
    for (let i = 0; i < 50; i++) {
      quotaManager.incrementSearchCount('supplier1');
    }
    quotaManager.incrementBookingCount('supplier1');

    expect(quotaManager.isQuotaHealthy('supplier1')).toBe(true);
  });

  test('should consider quota unhealthy when ratio exceeded', () => {
    quotaManager.setRequiredRatio('supplier1', 100);

    // Exceed ratio
    for (let i = 0; i < 120; i++) {
      quotaManager.incrementSearchCount('supplier1');
    }
    quotaManager.incrementBookingCount('supplier1');

    expect(quotaManager.isQuotaHealthy('supplier1')).toBe(false);
  });

  test('should calculate quota score', () => {
    quotaManager.setRequiredRatio('supplier1', 100);

    // Good ratio (lots of bookings)
    for (let i = 0; i < 50; i++) {
      quotaManager.incrementSearchCount('supplier1');
    }
    for (let i = 0; i < 10; i++) {
      quotaManager.incrementBookingCount('supplier1');
    }

    const score = quotaManager.getQuotaScore('supplier1');
    expect(score).toBeGreaterThan(0.5);
  });

  test('should reset counts', () => {
    quotaManager.incrementSearchCount('supplier1');
    quotaManager.incrementBookingCount('supplier1');
    quotaManager.resetCounts('supplier1');

    expect(quotaManager.getSearchCount('supplier1')).toBe(0);
    expect(quotaManager.getBookingCount('supplier1')).toBe(0);
  });
});
