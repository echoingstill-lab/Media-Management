const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim() || '';

export function joinApiUrl(path: string): string {
  if (!configuredApiBase) return path;
  const base = configuredApiBase.replace(/\/+$/u, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(joinApiUrl(path), init);
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<{ response: Response; data: T | null }> {
  const response = await apiFetch(path, init);
  const text = await response.text();
  try {
    return { response, data: text ? JSON.parse(text) as T : null };
  } catch {
    return { response, data: null };
  }
}
