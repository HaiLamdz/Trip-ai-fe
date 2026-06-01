'use client';

import { useEffect, useState } from 'react';

// Browser-side cache: query → image URL (lives for the tab session)
const cache = new Map<string, string | null>();

export const FALLBACK_COLORS: Record<string, string> = {
  food:       '#fed7aa',
  cafe:       '#e9d5ff',
  attraction: '#bfdbfe',
  hotel:      '#c7d2fe',
  transport:  '#e5e7eb',
  nightlife:  '#334155',
  shopping:   '#fbcfe8',
  other:      '#99f6e4',
};

const TYPE_QUERIES: Record<string, string> = {
  food:       'vietnamese food restaurant dish',
  cafe:       'coffee cafe interior cozy',
  attraction: 'vietnam travel landmark sightseeing',
  hotel:      'hotel room accommodation',
  transport:  'road travel vehicle',
  nightlife:  'night city bar lights',
  shopping:   'market shopping street',
  other:      'vietnam travel scenery',
};

export function useUnsplashImage(placeType: string, title: string) {
  // Build a focused query: type keywords + place title (trimmed to 80 chars)
  const query = `${TYPE_QUERIES[placeType] ?? 'travel'} ${title}`.slice(0, 80);
  const cacheKey = query;

  const [url, setUrl] = useState<string | null>(
    cache.has(cacheKey) ? cache.get(cacheKey)! : null
  );
  const [loading, setLoading] = useState(!cache.has(cacheKey));

  useEffect(() => {
    if (cache.has(cacheKey)) {
      setUrl(cache.get(cacheKey) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Call our Next.js API proxy — avoids CORS and keeps key server-side
    fetch(`/api/unsplash?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then((data: { url: string | null }) => {
        if (cancelled) return;
        cache.set(cacheKey, data.url ?? null);
        setUrl(data.url ?? null);
      })
      .catch(() => {
        if (!cancelled) cache.set(cacheKey, null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [cacheKey, query]);

  return {
    url,
    fallbackColor: FALLBACK_COLORS[placeType] ?? '#e5e7eb',
    loading,
  };
}
