export interface HealthResponse {
  status: 'ok' | 'ready' | 'not_ready' | string;
}