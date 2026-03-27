import { NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";

function buildYear(details, type) {
  if (type === "tv") {
    const start = details.first_air_date ? new Date(details.first_air_date).getFullYear() : "—";
    const end = details.status === "Ended" && details.last_air_date ? new Date(details.last_air_date).getFullYear() : null;
    if (end && start !== end) return `${start}–${end}`;
    return String(start);
  }
  return details.release_date ? String(new Date(details.release_date).getFullYear()) : "—";
}

export async function GET(request) {
  const token = process.env.TMDB_BEARER_TOKEN;
  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type");

  if (!token) {
    return NextResponse.json({ error: "Missing TMDB_BEARER_TOKEN in your environment variables." }, { status: 500 });
  }

  if (!id || (type !== "movie" && type !== "tv")) {
    return NextResponse.json({ error: "Invalid id or type." }, { status: 400 });
  }

  try {
    const [detailsResponse, creditsResponse] = await Promise.all([
      fetch(`${TMDB_BASE}/${type}/${id}`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }),
      fetch(`${TMDB_BASE}/${type}/${id}/credits`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }),
    ]);

    if (!detailsResponse.ok) {
      return NextResponse.json({ error: "TMDB details request failed." }, { status: detailsResponse.status });
    }

    const details = await detailsResponse.json();
    const credits = creditsResponse.ok ? await creditsResponse.json() : { cast: [] };
    const title = type === "tv" ? details.name : details.title;

    const result = {
      id: details.id,
      mediaType: type,
      title,
      year: buildYear(details, type),
      status: details.status || (type === "tv" ? "TV Series" : "Released"),
      seasons: details.number_of_seasons ?? null,
      episodes: details.number_of_episodes ?? null,
      rating: details.vote_average ? Number(details.vote_average).toFixed(1) : null,
      tagline: details.tagline || "",
      overview: details.overview || "No overview available yet.",
      genres: (details.genres || []).map((genre) => genre.name),
      cast: (credits.cast || []).slice(0, 8).map((person) => person.name),
      poster: details.poster_path ? `${POSTER_BASE}${details.poster_path}` : "",
      backdrop: details.backdrop_path ? `${BACKDROP_BASE}${details.backdrop_path}` : "",
      runtime: type === "movie" ? details.runtime ?? null : details.episode_run_time?.[0] ?? null,
      language: details.original_language ? details.original_language.toUpperCase() : "—",
      whyItHits: details.overview || "This title works best when you unpack character choices, tone, and emotional payoff.",
      notes: [
        `Look at how ${title} uses genre expectations to shape the emotional experience.`,
        `A useful discussion angle is whether the story resolves the plot and the emotional wound equally well.`,
        `Try tracking what repeats: relationships, symbols, choices, or moments of silence.`,
      ],
      prompts: [
        `What do you think ${title} is really trying to say beneath the plot?`,
        `Which character carries the emotional core of ${title}?`,
        `Did the ending of ${title} feel earned to you?`,
      ],
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Details request failed." }, { status: 500 });
  }
}
