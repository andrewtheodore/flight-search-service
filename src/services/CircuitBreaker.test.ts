import { CircuitBreaker, CircuitState } from '../services/CircuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(3, 1000, 'test-breaker');
  });

  test('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  test('should execute function successfully when closed', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalled();
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  test('should open circuit after threshold failures', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

    // Cause failures to reach threshold
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (e) {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  test('should reject immediately when circuit is open', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (e) {
        // Expected
      }
    }

    // Try to execute again
    await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker is OPEN');
  });

  test('should transition to HALF_OPEN after timeout', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (e) {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Next call should transition to HALF_OPEN
    mockFn.mockResolvedValue('success');
    await circuitBreaker.execute(mockFn);

    expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
  });

  test('should reset to CLOSED after successful calls in HALF_OPEN', async () => {
    const mockFn = jest.fn();

    // Open the circuit
    mockFn.mockRejectedValue(new Error('fail'));
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (e) {
        // Expected
      }
    }

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Succeed twice to close circuit
    mockFn.mockResolvedValue('success');
    await circuitBreaker.execute(mockFn);
    await circuitBreaker.execute(mockFn);

    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });
});
