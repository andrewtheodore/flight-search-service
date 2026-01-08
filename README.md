# Flight Search Service

A multi-supplier flight search system with rate limiting, circuit breaker protection, and quota optimization.

## Overview

This service provides a unified API for searching flights across multiple suppliers (Citilink, Garuda, LionAir) with intelligent orchestration to handle:
- Variable supplier latency (400ms - 5000ms)
- Per-supplier rate limiting
- Search-to-book ratio requirements
- Circuit breaker fault tolerance
- Response caching
- Parallel supplier calls with timeout management

## Key Features

### 🚀 First Response Guarantee (< 1 second)
- Parallel calls to all available suppliers
- Returns fastest response within 1 second
- Continues collecting responses in the background

### 📊 Complete Response Collection (< 5 seconds)
- Aggregates all supplier responses within 5 seconds
- Automatic timeout handling for slow suppliers
- Sorted results by price

### 🔒 Rate Limiting
- Token bucket algorithm per supplier
- Configurable requests per minute
- Automatic supplier exclusion when limits reached

### 💾 Intelligent Caching
- 5-minute TTL for search results
- Reduces redundant supplier calls
- Improves response times

### 🛡️ Circuit Breaker Protection
- Protects against cascading failures
- Automatic recovery after timeout
- Per-supplier fault isolation

### 📈 Quota Management
- Tracks search-to-book ratios
- Prioritizes suppliers with healthier quotas
- Prevents quota violations

## Architecture

```
Client → REST API → Search Orchestrator
                          ↓
         ┌────────────────┼────────────────┐
         ↓                ↓                ↓
   Rate Limiter    Rate Limiter    Rate Limiter
         ↓                ↓                ↓
   Circuit Breaker Circuit Breaker Circuit Breaker
         ↓                ↓                ↓
   Citilink        Garuda          LionAir
   Adapter         Adapter         Adapter
         ↓                ↓                ↓
         └────────────────┼────────────────┘
                          ↓
              Response Aggregator
                          ↓
                       Client
```

## Installation

```bash
# Clone the repository
git clone https://github.com/andrewtheodore/flight-search-service.git
cd flight-search-service

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting and Formatting
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Configuration

The service can be configured through environment variables or by modifying `src/config/index.ts`.

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (default: info)

### Supplier Configuration
Each supplier has configurable limits in `src/config/index.ts`:
- `rateLimit`: Requests per minute
- `requiredSearchToBookRatio`: Required ratio (e.g., 1000 = 1 booking per 1000 searches)
- `timeout`: Request timeout in milliseconds
- `circuitBreakerThreshold`: Failures before circuit opens
- `circuitBreakerTimeout`: Time before retry in milliseconds

## API Documentation

See [API.md](./API.md) for complete API documentation.

### Quick Start

**Search for flights:**
```bash
curl -X POST http://localhost:3000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "JKT",
    "destination": "DPS",
    "departureDate": "2024-12-20",
    "passengers": 2,
    "cabinClass": "economy"
  }'
```

**Check supplier status:**
```bash
curl http://localhost:3000/api/v1/suppliers/status
```

## Project Structure

```
src/
├── adapters/          # Supplier adapters
│   ├── SupplierAdapter.ts
│   ├── CitilinkAdapter.ts
│   ├── GarudaAdapter.ts
│   └── LionAirAdapter.ts
├── config/            # Configuration
│   └── index.ts
├── models/            # TypeScript interfaces
│   └── index.ts
├── routes/            # API routes
│   └── index.ts
├── services/          # Core services
│   ├── CacheService.ts
│   ├── CircuitBreaker.ts
│   ├── QuotaManager.ts
│   ├── RateLimiter.ts
│   └── SearchOrchestrator.ts
├── app.ts            # Express app setup
└── index.ts          # Entry point
```

## Component Details

### Search Orchestrator
Coordinates parallel supplier searches with:
- Supplier selection based on health and quota
- Concurrent request execution
- Timeout management (1s first, 5s max)
- Response aggregation and sorting

### Rate Limiter
Token bucket algorithm implementation:
- Per-supplier token management
- Automatic token refill
- Request blocking when limit reached

### Circuit Breaker
Protects against failing suppliers:
- States: CLOSED → OPEN → HALF_OPEN → CLOSED
- Configurable failure threshold
- Automatic recovery testing

### Quota Manager
Tracks search-to-book ratios:
- Per-supplier counters
- Health scoring
- Intelligent supplier prioritization

### Cache Service
In-memory caching with:
- Configurable TTL
- Key generation from search parameters
- Statistics tracking

### Supplier Adapters
Abstract interface with concrete implementations:
- Standardized request/response format
- Simulated latency for testing
- Mock data generation

## Monitoring

The service provides real-time monitoring through the `/api/v1/suppliers/status` endpoint:
- Average latency per supplier
- Rate limit utilization
- Search-to-book ratios
- Circuit breaker status
- Overall health status

## Testing

The project includes comprehensive tests:
- Unit tests for all services
- Integration tests for API endpoints
- Test coverage reporting

```bash
npm test
```

## Performance Characteristics

- **First Response:** < 1 second (guaranteed)
- **Complete Response:** < 5 seconds
- **Cache Hit Response:** < 50ms
- **Concurrent Supplier Calls:** All suppliers in parallel
- **Request Rate:** Configurable per supplier (800-1200 req/min)

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
