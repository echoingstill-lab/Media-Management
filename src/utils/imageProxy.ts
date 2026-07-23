import { joinApiUrl } from './api';

const pagesApiFallback = 'https://media-management-flax.vercel.app';

function getApiBaseForImages(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/u, '');
  if (import.meta.env.BASE_URL?.includes('/Media-Management/')) return pagesApiFallback;
  return '';
}

function joinImageProxyUrl(path: string): string {
  const imageApiBase = getApiBaseForImages();
  if (!imageApiBase) return joinApiUrl(path);
  return `${imageApiBase}${path}`;
}

export function getDisplayCoverUrl(url: string): string {
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';
  if (/^(data|blob):/iu.test(cleanUrl)) return cleanUrl;

  try {
    const parsed = new URL(cleanUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return cleanUrl;
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return cleanUrl;
    return joinImageProxyUrl(`/api/image-proxy?url=${encodeURIComponent(cleanUrl)}`);
  } catch {
    return cleanUrl;
  }
}
