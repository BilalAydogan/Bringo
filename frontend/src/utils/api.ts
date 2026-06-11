import axios from 'axios';

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.error?.message ?? error.response?.data?.message ?? fallback;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeResponse = (error as { response?: { data?: ApiErrorPayload } }).response;
    const message = maybeResponse?.data?.error?.message ?? maybeResponse?.data?.message;
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
