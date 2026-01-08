export class RateLimiter {
  private tokens: Map<string, number> = new Map();
  private lastRefill: Map<string, number> = new Map();
  private limits: Map<string, number> = new Map();

  constructor() {}

  setLimit(supplierId: string, requestsPerMinute: number): void {
    this.limits.set(supplierId, requestsPerMinute);
    this.tokens.set(supplierId, requestsPerMinute);
    this.lastRefill.set(supplierId, Date.now());
  }

  async acquire(supplierId: string): Promise<boolean> {
    this.refillTokens(supplierId);

    const currentTokens = this.tokens.get(supplierId) || 0;

    if (currentTokens > 0) {
      this.tokens.set(supplierId, currentTokens - 1);
      return true;
    }

    return false;
  }

  private refillTokens(supplierId: string): void {
    const limit = this.limits.get(supplierId);
    if (!limit) return;

    const now = Date.now();
    const lastRefill = this.lastRefill.get(supplierId) || now;
    const timePassed = now - lastRefill;
    const refillAmount = Math.floor((timePassed / 60000) * limit);

    if (refillAmount > 0) {
      const currentTokens = this.tokens.get(supplierId) || 0;
      const newTokens = Math.min(limit, currentTokens + refillAmount);
      this.tokens.set(supplierId, newTokens);
      this.lastRefill.set(supplierId, now);
    }
  }

  getAvailableTokens(supplierId: string): number {
    this.refillTokens(supplierId);
    return this.tokens.get(supplierId) || 0;
  }

  getRateLimit(supplierId: string): number {
    return this.limits.get(supplierId) || 0;
  }
}
