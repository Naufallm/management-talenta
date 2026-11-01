let csrf = '';
export const setCsrf = (value: string) => {
  csrf = value;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const multipart = options.body instanceof FormData;
  const response = await fetch('/api' + path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(multipart ? {} : { 'Content-Type': 'application/json' }),
      'X-CSRF-Token': csrf,
      ...options.headers,
    },
  });
  const data = await response
    .json()
    .catch(() => ({ message: 'Respons server tidak dapat dibaca.' }));
  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/login'))
      window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(response.status, data.message || 'Permintaan gagal.');
  }
  return data;
}
export const post = <T = any>(path: string, data: unknown = {}) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const put = <T = any>(path: string, data: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(data) });
export const patch = <T = any>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
