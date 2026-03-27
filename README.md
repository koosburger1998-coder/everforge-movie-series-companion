# Everforge — Movie & Series Companion

A live-only Next.js site for Vercel with protected TMDB API routes.

## What it does

- searches real movies and series from TMDB
- loads real details, posters, backdrops, genres, cast, runtime, and language
- keeps your TMDB token on the server only
- includes notes, spoiler mode, and a companion discussion chat
- no demo data

## Local setup

1. Copy `.env.local.example` to `.env.local`
2. Add your TMDB bearer token
3. Install packages
4. Run the dev server

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

## Vercel setup

Add this environment variable in Vercel project settings:

```text
TMDB_BEARER_TOKEN
```

Then deploy.

## Routes

- `GET /api/search?q=dark`
- `GET /api/details?id=1399&type=tv`

## TMDB attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
