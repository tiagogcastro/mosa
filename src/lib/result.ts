export type ErrorCode =
  | 'INVALID_INPUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_NOT_FOUND'
  | 'LOCAL_FILE_REQUIRED'
  | 'MEDIA_NOT_FOUND'
  | 'SOURCE_UNAVAILABLE';

export type Result<T> = { success: true; data: T } | { success: false; error: ErrorCode };
