import { API_BASE } from '@/lib/env';

type ApiRequestInit = Omit<RequestInit, 'body'> & { body?: unknown };

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(input: string, init: ApiRequestInit = {}): Promise<T> {
  const url = input.startsWith('http') ? input : `${API_BASE}${input}`;
  const { body: initBody, headers, ...rest } = init;
  const body = initBody !== undefined ? JSON.stringify(initBody) : undefined;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    ...rest,
    body,
  });

  if (res.ok) {
    return res.json();
  }

  const payload = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(payload);
  } catch {
    data = payload;
  }

  throw new ApiError(data?.message || res.statusText || 'Erreur API', res.status, data);
}

export const apiGet = <T>(url: string) => request<T>(url, { method: 'GET' });
export const apiPost = <T>(url: string, body: unknown) => request<T>(url, { method: 'POST', body });
export const apiPatch = <T>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body });
export const apiDelete = <T>(url: string) => request<T>(url, { method: 'DELETE' });
