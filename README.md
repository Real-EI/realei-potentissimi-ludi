# Realei – Gioca e impara

Tutorial game for [Real-EI](https://www.real-ei.it): read the documents of a real auction, find the clues
(surface, base price, auction date, occupancy) and ask Realei, the AI assistant, for hints.
Linked from the main site (frontend_realel, section "Gioca e impara", `NEXT_PUBLIC_GAME_URL`).

## Development (port 3001)

```bash
npm ci
cp .env.example .env      # LLM keys + NEXT_PUBLIC_SITE_URL
npm run dev               # http://localhost:3001
```

## Environment

| Variable | When | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | build | Public URL, used for Open Graph / X preview links |
| `LLM7_API_KEY`, `LLM7_MODEL` | runtime | llm7.io (first choice) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | runtime | OpenRouter (fallback, key checked for free at start) |
| `LLM_MAX_RETRIES`, `LLM_PROVIDER_COOLDOWN`, ... | runtime | retry / redirect tuning, see `.env.example` |

Without an LLM key the game still works; only the AI assistant answers "non configurato".

## Production

`release.yml` (push to `main`) creates the version tag with semantic-release, then `docker-deploy.yml`
builds the image and pushes `ghcr.io/<owner>/realei-potentissimi-ludi:<tag>` and `:latest`.
It can also be started by hand (Actions → Docker Build and Push → Run workflow).

GitHub setup: environment `PRODUCTION` with the variable `NEXT_PUBLIC_SITE_URL`
(e.g. `https://gioca.real-ei.it`); the `release` job uses the secret `PAT_GITHUB_JOBS`.

Run the image (LLM keys are runtime secrets, never baked into the image):

```bash
docker run -d --name realei-gioca -p 3001:3001 \
  -e LLM7_API_KEY=... -e OPENROUTER_API_KEY=... -e OPENROUTER_MODEL=... \
  ghcr.io/<owner>/realei-potentissimi-ludi:latest
```

## Layout

- `app/api/chat`: streamed AI assistant (`utils/llm.js`: llm7 → OpenRouter fallback, retries)
- `app/api/check`: checks the answers stored in `data/answers/` (not public)
- `public/auctions/<id>/`: documents and metadata of each auction, listed in `utils/auctions.js`
- `app/manifest.js`, `app/opengraph-image.jsx`: installable app + social preview image
