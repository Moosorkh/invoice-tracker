import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";

const STORAGE_KEY = "portalTenantSlug";

/**
 * Hook to get and persist the portal tenant slug
 * Falls back to sessionStorage if URL param is missing
 */
export function usePortalSlug(): string | undefined {
  const params = useParams<{ tenantSlug?: string; slug?: string }>();

  // Support both param names
  const slugFromUrl = params.tenantSlug ?? params.slug;

  const slug = useMemo(() => {
    if (slugFromUrl) return slugFromUrl;
    // Fallback to stored slug if URL doesn't have it
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ?? undefined;
  }, [slugFromUrl]);

  // Persist slug whenever we see it in the URL
  useEffect(() => {
    if (slugFromUrl) {
      sessionStorage.setItem(STORAGE_KEY, slugFromUrl);
    }
  }, [slugFromUrl]);

  return slug;
}

/**
 * Build a portal path with the given slug
 */
export function portalPath(slug: string | undefined, path: string): string {
  if (!slug) {
    console.warn("portalPath called without slug");
    return `/portal/${path}`;
  }
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/portal/${slug}/${cleanPath}`;
}
