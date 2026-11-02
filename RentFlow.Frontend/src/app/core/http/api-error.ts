import { HttpErrorResponse } from '@angular/common/http';

export function extractFieldErrors(err: HttpErrorResponse): Record<string, string[]> {
  const errors = err.error?.errors;
  if (!errors || typeof errors !== 'object') return {};

  const result: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(errors)) {
    const name = key.charAt(0).toLowerCase() + key.slice(1); // Email -> email
    result[name] = Array.isArray(messages) ? (messages as string[]) : [String(messages)];
  }
  return result;
}