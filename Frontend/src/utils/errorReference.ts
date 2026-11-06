const REQUEST_ID_HEADER = "x-request-id";

export function getErrorReferenceId(error: unknown): string | null {
  const candidate = error as {
    response?: { headers?: Headers | Record<string, string> };
    networkError?: { response?: { headers?: Headers | Record<string, string> } };
    extensions?: { requestId?: string };
  } | null;
  const headers = candidate?.response?.headers || candidate?.networkError?.response?.headers;
  const fromHeaders = headers && "get" in headers
    ? headers.get(REQUEST_ID_HEADER)
    : headers?.[REQUEST_ID_HEADER] || headers?.["X-Request-Id"];
  const value = fromHeaders || candidate?.extensions?.requestId;
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : null;
}

export function formatErrorWithReference(message: string, error: unknown): string {
  const reference = getErrorReferenceId(error);
  return reference ? `${message} Reference: ${reference}` : message;
}
