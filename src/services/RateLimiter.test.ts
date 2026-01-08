import { RateLimiter } from '../services/RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  test('should allow requests within rate limit', async () => {
    rateLimiter.setLimit('test-supplier', 10);

    for (let i = 0; i < 10; i++) {
      const result = await rateLimiter.acquire('test-supplier');
      expect(result).toBe(true);
    }
  });

  test('should block requests exceeding rate limit', async () => {
    rateLimiter.setLimit('test-supplier', 5);

    // Use up all tokens
    for (let i = 0; i < 5; i++) {
      await rateLimiter.acquire('test-supplier');
    }

    // Next request should be blocked
    const result = await rateLimiter.acquire('test-supplier');
    expect(result).toBe(false);
  });

  test('should refill tokens over time', async () => {
    rateLimiter.setLimit('test-supplier', 60); // 60 per minute = 1 per second

    // Use up all tokens
    for (let i = 0; i < 60; i++) {
      await rateLimiter.acquire('test-supplier');
    }

    // Wait for 2 seconds to allow refill
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Should have at least 2 tokens now
    const available = rateLimiter.getAvailableTokens('test-supplier');
    expect(available).toBeGreaterThanOrEqual(1);
  });

  test('should track separate limits for different suppliers', async () => {
    rateLimiter.setLimit('supplier1', 5);
    rateLimiter.setLimit('supplier2', 10);

    expect(rateLimiter.getRateLimit('supplier1')).toBe(5);
    expect(rateLimiter.getRateLimit('supplier2')).toBe(10);
  });
});
