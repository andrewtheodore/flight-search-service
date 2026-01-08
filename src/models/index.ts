export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass?: 'economy' | 'business' | 'first';
}

export interface Flight {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: string;
  availableSeats: number;
}

export interface FlightSearchResponse {
  supplier: string;
  flights: Flight[];
  searchId: string;
  timestamp: number;
}

export interface AggregatedSearchResponse {
  flights: Flight[];
  suppliers: string[];
  totalResults: number;
  responseTime: number;
  cached: boolean;
}

export interface BookingRequest {
  searchId: string;
  flightNumber: string;
  supplier: string;
  passengers: {
    firstName: string;
    lastName: string;
    email: string;
  }[];
}

export interface BookingResponse {
  bookingId: string;
  status: 'confirmed' | 'pending' | 'failed';
  flightNumber: string;
  supplier: string;
  totalPrice: number;
  currency: string;
}

export interface SupplierStatus {
  name: string;
  isHealthy: boolean;
  averageLatency: number;
  requestsPerMinute: number;
  rateLimit: number;
  searchCount: number;
  bookingCount: number;
  searchToBookRatio: number;
  requiredRatio: number;
  circuitBreakerStatus: 'closed' | 'open' | 'half-open';
  lastError?: string;
}
