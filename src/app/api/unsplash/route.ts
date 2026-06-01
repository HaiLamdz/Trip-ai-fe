import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache on the server side (per serverless instance)
const serverCache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? 'travel';
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  // Check cache
  const cached = serverCache.get(query);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ url: cached.url }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 86400 }, // Next.js fetch cache 24h
      }
    );

    if (!res.ok) {
      return NextResponse.json({ url: null }, { status: 200 });
    }

    const data = await res.json();
    // Pick a result based on query hash so same query always gets same image
    const results: { urls: { small: string } }[] = data?.results ?? [];
    if (results.length === 0) {
      return NextResponse.json({ url: null }, { status: 200 });
    }

    const hash = query.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const picked = results[hash % results.length];
    const url: string = picked.urls.small;

    serverCache.set(query, { url, ts: Date.now() });

    return NextResponse.json({ url }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json({ url: null }, { status: 200 });
  }
}
