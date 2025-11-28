export interface ApiResponse<T> {
  data: T;
  error: null;
  meta?: any;
}

export function buildResponse<T>(data: T, meta?: any): ApiResponse<T> {
  return {
    data,
    error: null,
    ...(meta !== undefined ? { meta } : {}),
  };
}
