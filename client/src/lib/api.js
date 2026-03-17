// In dev, VITE_API_URL is empty so Vite proxy handles /api/* → localhost:6000
// In production (Vercel), set VITE_API_URL to your Railway backend URL
const BASE = import.meta.env.VITE_API_URL ?? '';

export function getToken() {
  return localStorage.getItem('elective_token');
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

export default BASE;
