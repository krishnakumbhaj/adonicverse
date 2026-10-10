# API reference

All endpoints live under `/api`, take and return JSON (except image uploads), and are covered
end to end by `npm run test:api`.

## Conventions

**Responses.** Success: `{ "ok": true, "data": ... }`. Failure:

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid.", "fields": { "email": ["Enter a valid email address."] } } }
```

| Status | `code` | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR`, `BAD_REQUEST` | Invalid input, or a rule was broken (the message says which) |
| 401 | `UNAUTHORIZED` | Sign in first |
| 403 | `FORBIDDEN` | Signed in but not allowed |
| 404 | `NOT_FOUND` | Doesn't exist, or is a draft you can't see |
| 409 | `CONFLICT` | Username, email or handle already taken |
| 413 / 415 | `FILE_TOO_LARGE` / `UNSUPPORTED_IMAGE` | Image upload problems |
| 429 | `RATE_LIMITED` | Too many attempts; try later |

**Auth.** Sessions are NextAuth JWT cookies, so the browser sends them automatically. Sign in from the
client with `signIn('credentials', { identifier, password, redirect: false })` from `next-auth/react`
(`identifier` is the email or username), and sign out with `signOut()`. 🔒 marks endpoints that need a
signed-in user.

When `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, `signIn('google', { callbackUrl })` also works.
The first Google sign-in links the account with the same (Google-verified) email, or creates one with a
username made from the email. If that account's email was never verified, its password is removed, since
whoever set it never proved they own the address. Accounts made with Google have no password: password
sign-in fails for them, `POST /api/me/password` returns 400, and "forgot password" lets them add one.
Failed Google sign-ins come back to `/sign-in?error=<NextAuth error code>`.

**Pagination.** List endpoints take `?page=1&limit=20` (limit at most 50) and return
`{ items, page, limit, hasMore }`.

**Ids.** Stories, episodes, seasons, comments and reviews use ids. Channels use their `handle` and
users their `username`.

**Images.** Upload with `multipart/form-data`, the image in a field named `file`. JPEG, PNG or WebP,
at most 4 MB and at least 100×100. Image objects are `{ url, width, height }`.

**Story content.** Episode content is HTML from a rich-text editor. The server keeps `p, br, strong,
b, em, i, u, s, h2–h4, blockquote, ul, ol, li, hr, a` and strips everything else (scripts, styles,
images), so it is safe to render with `dangerouslySetInnerHTML`. Comments and reviews are plain text.

**Visibility.** Stories and episodes start as drafts. Readers see an episode only when both it and its
story are published. Authors see their own drafts everywhere.

## Main objects

```jsonc
// Story
{
  "id": "…", "slug": "the-moon-archive", "title": "The Moon Archive", "synopsis": "…",
  "poster": { "url": "…", "width": 1000, "height": 1500 },
  "type": "series",                       // "single" | "series"
  "genres": ["fantasy"], "tags": ["slow-burn"], "language": "hi",
  "contentRating": "general",             // "general" | "teen" | "mature"
  "status": "published",                  // "draft" | "published"
  "progress": "ongoing",                  // "ongoing" | "completed" | "hiatus" (single: always completed)
  "publishedAt": "…", "lastPublishedAt": "…",
  "latestEpisode": { "id": "…", "title": "…", "publishedAt": "…" },
  "stats": { "views": 0, "likes": 0, "comments": 0, "saves": 0, "episodes": 1, "seasons": 1, "words": 1200 },
  "rating": { "count": 2, "average": 4.5 },
  "channel": { "id": "…", "handle": "alicetales", "name": "Alice Tales", "avatar": null },
  "authorId": "…", "createdAt": "…", "updatedAt": "…"
}

// Episode (content only on GET /api/episodes/:id and after edits)
{
  "id": "…", "storyId": "…", "seasonId": "…",   // seasonId is null for single stories
  "title": "The Door", "order": 1, "status": "published",
  "wordCount": 1200, "readingMinutes": 6, "publishedAt": "…",
  "stats": { "views": 0, "likes": 0, "comments": 0 },
  "content": "<p>…</p>"
}

// Channel
{
  "id": "…", "handle": "alicetales", "name": "Alice Tales", "description": "…",
  "avatar": null, "banner": null, "stats": { "subscribers": 0, "stories": 0, "views": 0 },
  "ownerId": "…", "createdAt": "…"
}
```

## Accounts

| Method & path | Body / query | Notes |
| --- | --- | --- |
| `POST /api/auth/sign-up` | `{ username, email, password, displayName? }` | Username: 3–20 letters, numbers or `_` (stored lowercase). Password at least 8 characters. Checks the details (409 if taken) and emails a 6-digit code; no account exists yet. Returns `{ email, expiresInMinutes, resendAfterSeconds }`. Post again to re-send (once a minute, 5 an hour). 502 `EMAIL_FAILED` if the email can't be sent. |
| `POST /api/auth/sign-up/verify` | `{ email, code }` | Creates the account (email verified), 201 `{ user }`. Then sign in with `signIn()`. A code allows 5 wrong tries and works for 15 minutes; errors name the `code` field. |
| `GET /api/auth/username-available?username=` | | `{ available, reason? }` for live form feedback |
| `POST /api/auth/verify-email` | `{ token }` | For accounts made before sign-up codes: token from the emailed link `/verify-email?token=…` |
| `POST /api/auth/verify-email/resend` 🔒 | | Emails that link again |
| `POST /api/auth/forgot-password` | `{ email }` | Emails a 6-digit code. Unknown emails get the same 200. 429 if the account already reset its password in the last 24 hours (once a day), within a minute of the last code, or after 3 codes in a day. |
| `POST /api/auth/forgot-password/verify` | `{ email, code }` | Returns `{ token }` (valid 1 hour) for reset-password. Same code rules as sign-up. |
| `POST /api/auth/reset-password` | `{ token, password }` | Sets the password and starts the 24-hour wait before the next "forgot password". |
| `GET /api/me` 🔒 | | Your account, including `email`, `emailVerified`, `role` |
| `PATCH /api/me` 🔒 | `{ username?, displayName?, bio? }` | After changing username or name, call `useSession().update()` |
| `PUT /api/me/avatar` 🔒 · `DELETE` | multipart `file` | |
| `POST /api/me/password` 🔒 | `{ currentPassword, newPassword }` | |
| `GET /api/users/:username` | | Public profile and their channels |

## Channels

| Method & path | Body / query | Notes |
| --- | --- | --- |
| `GET /api/channels` | `?q=&sort=popular\|new` | Browse or search |
| `POST /api/channels` 🔒 | `{ handle, name, description? }` | Up to 3 channels per user. Handle: 3–30 letters, numbers or `_` |
| `GET /api/channels/:handle` | | `{ channel, owner, viewer: { canManage, subscribed } \| null }` |
| `PATCH /api/channels/:handle` 🔒 | `{ handle?, name?, description? }` | Owner only |
| `DELETE /api/channels/:handle` 🔒 | | Deletes every story, episode, comment and image in it |
| `PUT\|DELETE /api/channels/:handle/avatar` 🔒 | multipart `file` | Square image |
| `PUT\|DELETE /api/channels/:handle/banner` 🔒 | multipart `file` | Wide image |
| `GET /api/channels/:handle/stories` | `?sort=updated\|new\|popular&status=published\|draft\|all` | `status` other than published is for the owner |
| `POST\|DELETE /api/channels/:handle/subscribe` 🔒 | | `{ subscribed, subscribers }` |

## Stories

| Method & path | Body / query | Notes |
| --- | --- | --- |
| `GET /api/stories` | see below | Discover published stories |
| `POST /api/stories` 🔒 | `{ channelId, type, title, genres, synopsis?, tags?, language?, contentRating?, content? }` | Creates a draft. A series starts with an empty Season 1. A single story starts with its one episode; `content` (HTML) fills it |
| `GET /api/stories/:id` | | `{ story, viewer }`. `viewer` is null when signed out, else `{ canManage, inLibrary, subscribedToChannel, review, progress }` |
| `PATCH /api/stories/:id` 🔒 | `{ title?, synopsis?, genres?, tags?, language?, contentRating?, progress? }` | `progress` is for series only |
| `DELETE /api/stories/:id` 🔒 | | Deletes seasons, episodes, comments, reviews and the poster |
| `PUT\|DELETE /api/stories/:id/poster` 🔒 | multipart `file` | A 2:3 portrait such as 1000×1500 fits story cards |
| `POST /api/stories/:id/publish` 🔒 | | Single: publishes its episode too (it must have text). Series: needs at least one published episode. Subscribers are notified the first time |
| `DELETE /api/stories/:id/publish` 🔒 | | Back to draft |

**Discover parameters** (`GET /api/stories`): `q` (full-text search over title, tags, synopsis),
`genre`, `tag`, `type` (`single|series`), `language` (2-letter code), `contentRating`, `progress`,
`includeMature=true`, and `sort`: `relevance` (default with `q`), `updated` (default), `new`,
`popular`, `most-liked`, `top-rated`. Mature stories are left out unless `includeMature=true` or
`contentRating=mature`.

`genres` takes 1–3 values from `GET /api/options`. `tags` takes up to 10 free-form tags, normalized
so that `"#Slow Burn"` becomes `slow-burn`.

## Seasons and episodes

| Method & path | Body | Notes |
| --- | --- | --- |
| `GET /api/stories/:id/episodes` | | Table of contents: `{ type, seasons: [{ id, title, order, episodes: [...] }], episodes: [...] }`. Series episodes are under `seasons`; a single story's one episode is in `episodes`. Readers don't see empty seasons |
| `POST /api/stories/:id/seasons` 🔒 | `{ title?, synopsis? }` | Series only. An untitled season shows as "Season N" |
| `PUT /api/stories/:id/seasons/order` 🔒 | `{ order: [seasonId, ...] }` | Every season, in the new order |
| `PATCH /api/seasons/:id` 🔒 | `{ title?, synopsis? }` | |
| `DELETE /api/seasons/:id` 🔒 | | Deletes its episodes too |
| `PUT /api/seasons/:id/episodes/order` 🔒 | `{ order: [episodeId, ...] }` | Every episode of the season |
| `POST /api/stories/:id/episodes` 🔒 | `{ seasonId, title, content? }` | Series only; added as a draft at the end of the season |
| `GET /api/episodes/:id` | | Reading page: `{ episode (with content), season, story, navigation: { previous, next, position, total }, viewer: { canManage, liked } }` |
| `PATCH /api/episodes/:id` 🔒 | `{ title?, content?, seasonId? }` | `seasonId` moves it to the end of another season. A single story's episode only takes `content` (its title follows the story) |
| `DELETE /api/episodes/:id` 🔒 | | Series only |
| `POST\|DELETE /api/episodes/:id/publish` 🔒 | | Series only (single stories publish with the story). The last published episode of a published series can't be unpublished or deleted; unpublish the series first |

## Reading and engagement

| Method & path | Body / query | Notes |
| --- | --- | --- |
| `POST /api/episodes/:id/view` | | Call once the reader has actually started reading. Counts once per reader per 24 h; authors' own views don't count. `{ counted, views }` |
| `POST\|DELETE /api/episodes/:id/like` 🔒 | | `{ liked, likes }` |
| `GET /api/episodes/:id/comments` | `?sort=newest\|oldest` | Top-level comments plus `total`. Each has `replyCount` and `byStoryAuthor` |
| `POST /api/episodes/:id/comments` 🔒 | `{ body, parentId? }` | Up to 2000 characters. Replies are one level deep: replying to a reply joins its thread |
| `GET /api/comments/:id/replies` | | Oldest first |
| `PATCH /api/comments/:id` 🔒 | `{ body }` | Your own comments only |
| `DELETE /api/comments/:id` 🔒 | | The comment's author, the story's author, or an admin. Deleting a top-level comment deletes its replies |
| `GET /api/stories/:id/reviews` | | Plus `rating: { count, average }` |
| `PUT /api/stories/:id/reviews` 🔒 | `{ rating: 1–5, body? }` | Create or replace your review. Not on your own story |
| `DELETE /api/reviews/:id` 🔒 | | Its author or an admin |
| `POST\|DELETE /api/stories/:id/library` 🔒 | | Save to library. `{ inLibrary, saves }` |
| `PUT /api/stories/:id/progress` 🔒 | `{ episodeId, position }` | `position` from 0 (top) to 1 (end). Send it every ~10 s while reading and when leaving |
| `DELETE /api/stories/:id/progress` 🔒 | | Remove from "continue reading" |

## Your stuff 🔒

| Method & path | Notes |
| --- | --- |
| `GET /api/me/channels` | Channels you own |
| `GET /api/me/subscriptions` | Channels you subscribe to: `[{ channel, subscribedAt }]` |
| `GET /api/me/feed` | Recently updated stories from your subscriptions |
| `GET /api/me/library` | `[{ story, savedAt }]` |
| `GET /api/me/history` | Continue reading: `[{ story, episode, position, updatedAt }]` |
| `GET /api/me/notifications?unread=true` | Plus `unreadCount`. Types: `new_subscriber`, `new_story`, `new_episode`, `new_comment`, `comment_reply`, `new_review`. Each item has `actor`, `channel`, `story`, `episode` and `comment` when they apply. Deleted after 90 days |
| `POST /api/me/notifications/read` | `{ ids? }`; leave out `ids` to mark all as read |

## Other

| Method & path | Notes |
| --- | --- |
| `GET /api/options` | Genres, story types, content ratings, progress values and limits, for forms |
| `GET /api/tags/popular` | Top 30 tags: `[{ tag, stories }]` |
| `GET /api/health` | `{ status: "up" }` once the database is reachable |
| `GET /api/media/...` | Serves images when using local storage (development) |
