// Helper type for Mongoose validation errors
export interface MongooseValidationError {
  errors: Record<string, { message: string }>;
  code?: number;
}

// Type guard for Mongoose errors
export function isMongooseError(error: unknown): error is MongooseValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('errors' in error || 'code' in error)
  );
}
