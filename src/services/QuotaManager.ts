export class QuotaManager {
  private searchCounts: Map<string, number> = new Map();
  private bookingCounts: Map<string, number> = new Map();
  private requiredRatios: Map<string, number> = new Map();

  constructor() {}

  setRequiredRatio(supplierId: string, ratio: number): void {
    this.requiredRatios.set(supplierId, ratio);
  }

  incrementSearchCount(supplierId: string): void {
    const current = this.searchCounts.get(supplierId) || 0;
    this.searchCounts.set(supplierId, current + 1);
  }

  incrementBookingCount(supplierId: string): void {
    const current = this.bookingCounts.get(supplierId) || 0;
    this.bookingCounts.set(supplierId, current + 1);
  }

  getSearchCount(supplierId: string): number {
    return this.searchCounts.get(supplierId) || 0;
  }

  getBookingCount(supplierId: string): number {
    return this.bookingCounts.get(supplierId) || 0;
  }

  getSearchToBookRatio(supplierId: string): number {
    const searchCount = this.searchCounts.get(supplierId) || 0;
    const bookingCount = this.bookingCounts.get(supplierId) || 0;

    if (bookingCount === 0) {
      return searchCount > 0 ? Infinity : 0;
    }

    return searchCount / bookingCount;
  }

  isQuotaHealthy(supplierId: string): boolean {
    const requiredRatio = this.requiredRatios.get(supplierId);
    if (!requiredRatio) return true;

    const currentRatio = this.getSearchToBookRatio(supplierId);
    const bookingCount = this.bookingCounts.get(supplierId) || 0;

    // If we haven't made any bookings yet, allow searches up to half the required ratio
    if (bookingCount === 0) {
      const searchCount = this.searchCounts.get(supplierId) || 0;
      return searchCount < requiredRatio / 2;
    }

    // Otherwise, check if we're within the required ratio (with 10% buffer)
    return currentRatio <= requiredRatio * 1.1;
  }

  getQuotaScore(supplierId: string): number {
    const requiredRatio = this.requiredRatios.get(supplierId);
    if (!requiredRatio) return 1;

    const currentRatio = this.getSearchToBookRatio(supplierId);
    if (currentRatio === Infinity) return 0;

    // Score from 0 to 1, where 1 is the best (many bookings relative to searches)
    return Math.max(0, Math.min(1, 1 - currentRatio / (requiredRatio * 2)));
  }

  getRequiredRatio(supplierId: string): number {
    return this.requiredRatios.get(supplierId) || 0;
  }

  resetCounts(supplierId: string): void {
    this.searchCounts.set(supplierId, 0);
    this.bookingCounts.set(supplierId, 0);
  }
}
