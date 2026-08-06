type ApiErrorDetails = {
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
  fieldErrors?: Record<string, string[] | string>;
  [key: string]: any;
};

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim());
    if (typeof first === 'string') return first;
  }
  return undefined;
}

export function getApiErrorDetails(err: any): ApiErrorDetails | null {
  return err?.details || err?.response?.details || err?.error?.details || null;
}

export function getApiErrorMessage(err: any, fallback = 'Something went wrong'): string {
  const details = getApiErrorDetails(err);
  if (err?.message && err.message !== 'Request failed') {
    return err.message;
  }

  const fieldErrors = details?.fieldErrors;
  if (fieldErrors) {
    for (const value of Object.values(fieldErrors)) {
      const message = firstMessage(value);
      if (message) return message;
    }
  }

  if (Array.isArray(details?.issues) && details?.issues.length > 0) {
    const first = details.issues[0];
    if (first?.message) return first.message;
  }

  return err?.message || fallback;
}

export function getApiFieldErrors(err: any): Record<string, string> {
  const details = getApiErrorDetails(err);
  const fieldErrors: Record<string, string> = {};

  for (const [field, value] of Object.entries(details?.fieldErrors || {})) {
    const message = firstMessage(value);
    if (message) {
      fieldErrors[field] = message;
    }
  }

  if (Array.isArray(details?.issues)) {
    for (const issue of details.issues) {
      const field = issue?.path?.[0];
      if (typeof field === 'string' && issue?.message && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
  }

  return fieldErrors;
}
