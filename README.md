# adonic

A place to write and read stories. Writers create **channels** and publish **stories**: either a
**single** short story, or a **series** split into **seasons** and **episodes**. Every story can have
a **poster**. Readers subscribe to channels, like and comment on episodes, rate and review stories,
save them to a library, and pick up where they left off.

The design follows Spotify's layout on desktop, tablet and phone, in the "Neon Orchid" dark palette
(Spotify's blacks with `#D16BFF`) with Plus Jakarta Sans, Newsreader for story text, and Noto Sans
Devanagari for Hindi. `/palettes` and `/fonts` are the design comparison pages used to choose them.
The logo and wordmark live in `src/assets/brand/`; the browser icons are `src/app/icon.png` and
`src/app/apple-icon.png`.

## Pages

| Area | Pages |
| --- | --- |
| Reading | `/` home, `/search`, `/genre/[slug]`, `/browse`, `/story/[id]`, `/read/[episodeId]`, `/channel/[handle]`, `/u/[username]` |
| Your stuff (sign-in) | `/library`, `/notifications`, `/settings` |
| Account | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email` |
| Studio (sign-in) | `/studio`, `/studio/channel/[handle]`, `/studio/new`, `/studio/story/[id]`, `/studio/episode/[id]` (editor) |

Layouts: `src/app/(app)` pages share the Spotify shell (top bar, Your Library sidebar, bottom bar,
phone tabs); `src/app/(focus)` holds the full-screen reader and editor; `src/app/(auth)` the account pages.

## Stack

Next.js 15 (App Router) · TypeScript · MongoDB with Mongoose · NextAuth (email/username and password,
JWT sessions) · Zod validation · Cloudinary for images · Resend for email · Tailwind CSS · SWR for
data fetching · TipTap for the episode editor.

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `MONGODB_URI`, `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.
   Cloudinary and Resend are optional in development.
3. `npm run dev`, then open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run test:api` | End-to-end API test against a throwaway in-memory MongoDB (doesn't touch your database) |

## Importing classic stories

`npm run import:classics` fills the site with public-domain stories, each with a generated poster.

- **English**: Project Gutenberg books (catalog from [Gutendex](https://gutendex.com), text from
  Gutenberg mirrors as Gutenberg asks), split into seasons and episodes when the book has parts
  and chapters.
- **Hindi**: Hindi Wikisource (Premchand's *Mansarovar*, Guleri, Jaishankar Prasad).
- Stories go to one channel per author, owned by the official **adonic** account.

```
npm run import:classics -- --dry-run --limit=20   # preview only, files in .import-preview/
npm run import:classics -- --batch=1              # every genre + 50 Hindi stories
npm run import:classics -- --batch=2              # then 2, 3, 4 (thriller, romance, horror first)
```

It skips stories that are already imported, stops at `--max-mb=250` of database size, and
uploads posters to Cloudinary when `CLOUDINARY_URL` is set. The plan (genres, targets, sources)
is in `scripts/import/plan.ts`.

## Project layout

```
src/
  app/(app)       Pages inside the Spotify-style shell
  app/(focus)     Reader and episode editor (full screen)
  app/(auth)      Log in, sign up, password reset, email verification
  app/api/        Route handlers, one folder per URL (see docs/API.md)
  assets/brand/   Logo and wordmark
  components/app/ Shell, cards, shelves, buttons, fields, menus, toasts
  components/studio/  Writer tools: story form, channel form, uploads
  config/         Genres, languages, limits, site name
  lib/            Server infrastructure (database, auth, images, email, rate limiting)
  lib/client/     Browser helpers: API calls, SWR hooks, response types, colors
  models/         Mongoose models
  schemas/        Zod schemas shared by the API and the forms
  server/         Domain logic: permissions, serializers, cascading deletes, notifications
scripts/          api-smoke-test.mjs, import/ (classic stories importer)
docs/API.md       API reference
```

## API

See [docs/API.md](docs/API.md).
