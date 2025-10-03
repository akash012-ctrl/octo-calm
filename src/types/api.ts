/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    message?: string;
}

/**
 * API error structure
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    statusCode?: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

/**
 * API request status
 */
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Form validation error
 */
export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Async operation state
 */
export interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    status: RequestStatus;
}
