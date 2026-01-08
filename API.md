# Flight Search Service API Documentation

## Overview
The Flight Search Service provides a REST API for searching flights across multiple suppliers with built-in rate limiting, circuit breaker protection, and quota management.

## Base URL
```
http://localhost:3000/api/v1
```

## Endpoints

### 1. Flight Search

Search for flights across all available suppliers.

**Endpoint:** `POST /api/v1/search`

**Request Body:**
```json
{
  "origin": "JKT",
  "destination": "DPS",
  "departureDate": "2024-12-20",
  "returnDate": "2024-12-27",
  "passengers": 2,
  "cabinClass": "economy"
}
```

**Request Fields:**
- `origin` (string, required): Origin airport code (e.g., "JKT")
- `destination` (string, required): Destination airport code (e.g., "DPS")
- `departureDate` (string, required): Departure date in ISO 8601 format (YYYY-MM-DD)
- `returnDate` (string, optional): Return date in ISO 8601 format for round-trip flights
- `passengers` (number, required): Number of passengers (minimum 1)
- `cabinClass` (string, optional): Cabin class - "economy", "business", or "first" (default: "economy")

**Response:**
```json
{
  "success": true,
  "data": {
    "flights": [
      {
        "flightNumber": "CT1000",
        "airline": "Citilink",
        "origin": "JKT",
        "destination": "DPS",
        "departureTime": "2024-12-20T08:00:00.000Z",
        "arrivalTime": "2024-12-20T10:00:00.000Z",
        "price": 250.50,
        "currency": "USD",
        "availableSeats": 120
      }
    ],
    "suppliers": ["Citilink", "Garuda", "LionAir"],
    "totalResults": 12,
    "responseTime": 850,
    "cached": false
  }
}
```

**Response Fields:**
- `success`: Boolean indicating request success
- `data.flights`: Array of flight objects sorted by price
- `data.suppliers`: List of suppliers that responded
- `data.totalResults`: Total number of flights found
- `data.responseTime`: Response time in milliseconds
- `data.cached`: Whether results were served from cache

**Status Codes:**
- `200 OK`: Successful search
- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Server error

---

### 2. Book Flight

Create a flight booking.

**Endpoint:** `POST /api/v1/book`

**Request Body:**
```json
{
  "searchId": "550e8400-e29b-41d4-a716-446655440000",
  "flightNumber": "CT1000",
  "supplier": "Citilink",
  "passengers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    },
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane.doe@example.com"
    }
  ]
}
```

**Request Fields:**
- `searchId` (string, required): Search ID from the search response
- `flightNumber` (string, required): Flight number to book
- `supplier` (string, required): Supplier name
- `passengers` (array, required): Array of passenger objects (minimum 1)
  - `firstName` (string): Passenger's first name
  - `lastName` (string): Passenger's last name
  - `email` (string): Passenger's email address

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "BK1702987654321",
    "status": "confirmed",
    "flightNumber": "CT1000",
    "supplier": "Citilink",
    "totalPrice": 500,
    "currency": "USD"
  }
}
```

**Status Codes:**
- `200 OK`: Booking successful
- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Server error

---

### 3. Supplier Status

Get health and quota status of all suppliers.

**Endpoint:** `GET /api/v1/suppliers/status`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Citilink",
      "isHealthy": true,
      "averageLatency": 823.5,
      "requestsPerMinute": 950,
      "rateLimit": 1000,
      "searchCount": 1250,
      "bookingCount": 2,
      "searchToBookRatio": 625,
      "requiredRatio": 1000,
      "circuitBreakerStatus": "closed",
      "lastError": null
    }
  ]
}
```

**Response Fields:**
- `name`: Supplier name
- `isHealthy`: Overall health status (considers circuit breaker and quota)
- `averageLatency`: Average response latency in milliseconds
- `requestsPerMinute`: Current requests per minute
- `rateLimit`: Maximum requests per minute allowed
- `searchCount`: Total search requests made
- `bookingCount`: Total bookings made
- `searchToBookRatio`: Current search-to-book ratio
- `requiredRatio`: Required search-to-book ratio
- `circuitBreakerStatus`: Circuit breaker state ("closed", "open", "half-open")
- `lastError`: Last error message (if any)

**Status Codes:**
- `200 OK`: Status retrieved successfully
- `500 Internal Server Error`: Server error

---

### 4. Health Check

Check service health.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

**Status Codes:**
- `200 OK`: Service is healthy

---

## Response Time Guarantees

The service implements a "first response wins" pattern:
- **First Response:** At least one supplier response within 1 second
- **Complete Response:** All available supplier responses collected within 5 seconds
- **Cache Hit:** Cached responses returned immediately (< 50ms typical)

## Rate Limiting

Each supplier has individual rate limits:
- **Citilink:** 1000 requests/minute
- **Garuda:** 800 requests/minute
- **LionAir:** 1200 requests/minute

When a supplier's rate limit is reached, the service automatically excludes it from the search until capacity is available.

## Quota Management

Suppliers enforce search-to-book ratios:
- **Citilink:** 1:1000 (1 booking per 1000 searches)
- **Garuda:** 1:500
- **LionAir:** 1:1500

The service tracks these ratios and prioritizes suppliers with healthier quotas.

## Circuit Breaker

Each supplier has a circuit breaker that:
- Opens after 5 consecutive failures
- Stays open for 60 seconds
- Transitions to half-open for testing
- Closes after 2 successful attempts

## Caching

Search results are cached for 5 minutes to:
- Reduce load on suppliers
- Improve response times
- Optimize quota usage

Cache key includes: origin, destination, dates, passengers, and cabin class.

## Error Responses

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## Example Usage

### Search for flights
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

### Book a flight
```bash
curl -X POST http://localhost:3000/api/v1/book \
  -H "Content-Type: application/json" \
  -d '{
    "searchId": "550e8400-e29b-41d4-a716-446655440000",
    "flightNumber": "CT1000",
    "supplier": "Citilink",
    "passengers": [
      {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
      }
    ]
  }'
```

### Check supplier status
```bash
curl http://localhost:3000/api/v1/suppliers/status
```
