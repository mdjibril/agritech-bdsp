const API_PREFIX = '/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('v4v_token');
  const url = path.startsWith(API_PREFIX)
    ? path
    : `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

export async function apiV1(path, options = {}) {
  return api(`/v1${path.startsWith('/') ? path : `/${path}`}`, options);
}

export function money(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
