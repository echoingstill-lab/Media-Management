const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim() || '';

function joinApiUrl(path: string): string {
  if (!configuredApiBase) return path;
  const base = configuredApiBase.replace(/\/+$/u, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(joinApiUrl(path), init);
}
