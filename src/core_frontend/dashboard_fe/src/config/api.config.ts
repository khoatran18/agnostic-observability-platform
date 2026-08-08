// Re-export everything from the unified config for backwards compatibility
// (All new code should import directly from app.config.ts)
export { APP_CONFIG as API_CONFIG, API_ENDPOINTS, buildUrl, BACKEND_BASE_URL as BASE_URL } from './app.config';
