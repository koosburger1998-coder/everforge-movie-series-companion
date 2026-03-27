import { NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

export async function GET(request) {
  const token = process.env.TMDB_BEARER_TOKEN;
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Missing TMDB_BEARER_TOKEN in your environment variables." }, { status: 500 });
  }

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const response = await fetch(`${TMDB_BASE}/search/multi?query=${encodeURIComponent(q)}&include_adult=false`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "TMDB search request failed." }, { status: response.status });
    }

    const data = await response.json();
    const results = (data.results || [])
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        media_type: item.media_type,
        title: item.title || item.name || "Untitled",
        year: item.release_date ? String(new Date(item.release_date).getFullYear()) : item.first_air_date ? String(new Date(item.first_air_date).getFullYear()) : "—",
        rating: item.vote_average ? Number(item.vote_average).toFixed(1) : "—",
        subtitle: item.overview || "No overview available yet.",
        poster: item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : "",
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search request failed." }, { status: 500 });
  }
}
