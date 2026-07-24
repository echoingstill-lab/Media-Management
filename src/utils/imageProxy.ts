import { joinApiUrl } from './api';

const pagesApiFallback = 'https://media-management-flax.vercel.app';

type CoverDisplayMode = 'card' | 'detail';

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

function shouldProxyImage(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();
  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

  if (isHttpsPage && parsed.protocol === 'http:') return true;
  if (host.endsWith('doubanio.com') || host.endsWith('douban.com')) return true;
  return false;
}

function getCardSizedImageUrl(parsed: URL): string {
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  if (host.endsWith('doubanio.com')) {
    parsed.pathname = path
      .replace('/l_ratio_poster/', '/m_ratio_poster/')
      .replace('/view/subject/l/', '/view/subject/m/')
      .replace('/lpic/', '/mpic/')
  }

  if (host.endsWith('mzstatic.com')) {
    parsed.pathname = path.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, '/300x300bb.$1');
  }

  if (host.endsWith('media-amazon.com') || host.endsWith('ssl-images-amazon.com')) {
    parsed.pathname = path.replace(/\._V1_[^/]+(\.(?:jpg|jpeg|png|webp))$/i, '._V1_UX300$1');
  }

  return parsed.toString();
}

export function getDisplayCoverUrl(url: string, mode: CoverDisplayMode = 'detail'): string {
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';
  if (/^(data|blob):/iu.test(cleanUrl)) return cleanUrl;

  try {
    const parsed = new URL(cleanUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return cleanUrl;
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return cleanUrl;
    const displayUrl = mode === 'card' ? getCardSizedImageUrl(parsed) : parsed.toString();
    if (!shouldProxyImage(new URL(displayUrl))) return displayUrl;
    return joinImageProxyUrl(`/api/image-proxy?url=${encodeURIComponent(displayUrl)}`);
  } catch {
    return cleanUrl;
  }
}
