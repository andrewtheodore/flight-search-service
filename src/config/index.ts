export interface SupplierConfig {
  name: string;
  baseUrl: string;
  rateLimit: number; // requests per minute
  requiredSearchToBookRatio: number; // e.g., 1000 means 1 booking per 1000 searches
  timeout: number; // in milliseconds
  circuitBreakerThreshold: number; // number of failures before opening circuit
  circuitBreakerTimeout: number; // time in ms before trying again
}

export const SUPPLIER_CONFIGS: SupplierConfig[] = [
  {
    name: 'Citilink',
    baseUrl: 'http://api.citilink.example.com',
    rateLimit: 1000,
    requiredSearchToBookRatio: 1000,
    timeout: 5000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
  },
  {
    name: 'Garuda',
    baseUrl: 'http://api.garuda.example.com',
    rateLimit: 800,
    requiredSearchToBookRatio: 500,
    timeout: 5000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
  },
  {
    name: 'LionAir',
    baseUrl: 'http://api.lionair.example.com',
    rateLimit: 1200,
    requiredSearchToBookRatio: 1500,
    timeout: 5000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
  },
];

export const APP_CONFIG = {
  port: process.env.PORT || 3000,
  firstResponseTimeout: 1000, // 1 second
  maxResponseTimeout: 5000, // 5 seconds
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutes in seconds
  logLevel: process.env.LOG_LEVEL || 'info',
};
