// End-to-end check of the whole API. It starts a throwaway in-memory MongoDB (a replica set,
// because the API uses transactions) and a Next.js dev server pointed at it, then walks through
// what writers and readers do. Your real database in .env is never touched.
//
//   npm run test:api

import { execSync, spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const PORT = Number(process.env.SMOKE_PORT ?? 3123);
const BASE = `http://localhost:${PORT}`;
const UPLOADS_DIR = path.resolve('.uploads-smoke-test');

let passed = 0;
function check(condition, message, detail) {
  if (!condition) {
    throw new Error(`FAILED: ${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`);
  }
  passed += 1;
  console.log(`  ok  ${message}`);
}

const serverLog = [];

/** A browser-like client that keeps its own cookies (one per test user). */
class Client {
  cookies = new Map();

  async request(method, url, { json, form } = {}) {
    const headers = {};
    if (json !== undefined) headers['content-type'] = 'application/json';
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const response = await fetch(BASE + url, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : form,
      redirect: 'manual',
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const text = await response.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON (images, HTML)
    }
    return { status: response.status, body, headers: response.headers };
  }

  get = (url) => this.request('GET', url);
  post = (url, json) => this.request('POST', url, { json });
  put = (url, json) => this.request('PUT', url, { json });
  patch = (url, json) => this.request('PATCH', url, { json });
  delete = (url) => this.request('DELETE', url);
  upload = (url, bytes, method = 'PUT') => {
    const form = new FormData();
    form.append('file', new Blob([bytes]), 'upload.bin');
    return this.request(method, url, { form });
  };

  async signIn(identifier, password) {
    const { body } = await this.get('/api/auth/csrf');
    await this.request('POST', '/api/auth/callback/credentials', {
      form: new URLSearchParams({ csrfToken: body.csrfToken, identifier, password, json: 'true' }),
    });
    return (await this.get('/api/auth/session')).body;
  }
}

/** Smallest PNG header image-size accepts: signature + IHDR with the given dimensions. */
function pngHeader(width, height) {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 2;
  return bytes;
}

/** Where the server log ends now, so `emailedCode` only looks at emails sent after this point. */
const logMark = () => serverLog.join('').length;

/** Emails are printed by the dev server when RESEND_API_KEY is empty; read the 6-digit code from there. */
async function emailedCode(email, since) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const log = serverLog.join('').slice(since);
    const start = log.indexOf(`[email] To: ${email}`);
    const match = start >= 0 && log.slice(start).match(/Your code: (\d{6})/);
    if (match) return match[1];
    await sleep(100);
  }
  throw new Error(`No code email for ${email} in the server log`);
}

/** A code that is certainly not `code`. */
const otherCode = (code) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

/** Notifications are written after the response (Next.js `after`), so poll for them. */
async function waitForNotification(client, type) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const { body } = await client.get('/api/me/notifications?limit=50');
    const found = body.data.items.find((item) => item.type === type);
    if (found) return found;
    await sleep(100);
  }
  return null;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await sleep(500);
  }
  throw new Error('The dev server did not become healthy in 2 minutes');
}

async function run() {
  const alice = new Client(); // writer
  const bob = new Client(); // reader
  const carol = new Client(); // another reader
  const anonymous = new Client();
  const data = (response) => response.body.data;

  console.log('\nAccounts');
  check((await anonymous.post('/api/channels', { handle: 'x', name: 'x' })).status === 401, 'writing requires sign-in');
  const invalid = await anonymous.post('/api/auth/sign-up', { username: 'a', email: 'nope', password: 'short' });
  check(invalid.status === 400 && invalid.body.error.code === 'VALIDATION_ERROR', 'sign-up validates input', invalid.body);
  check(Boolean(invalid.body.error.fields?.email), 'validation errors name the fields');

  const signUps = [['Alice', 'alice@example.com'], ['bob', 'bob@example.com'], ['carol', 'carol@example.com']];
  for (const [username, email] of signUps) {
    const since = logMark();
    const res = await anonymous.post('/api/auth/sign-up', { username, email, password: 'password123', displayName: username });
    check(res.status === 200, `sign up ${username}: a code is emailed`, res.body);
    const code = await emailedCode(email, since);
    if (username === 'Alice') {
      check((await new Client().signIn('alice', 'password123')).user === undefined, 'no account until the code is entered');
      const wrong = await anonymous.post('/api/auth/sign-up/verify', { email, code: otherCode(code) });
      check(wrong.status === 400 && wrong.body.error.fields?.code, 'a wrong sign-up code is rejected', wrong.body);
    }
    check((await anonymous.post('/api/auth/sign-up/verify', { email, code })).status === 201, `${username} enters the code`);
    if (username === 'Alice') {
      check((await anonymous.post('/api/auth/sign-up/verify', { email, code })).status === 400, 'sign-up codes are single-use');
    }
  }
  check((await anonymous.get('/api/auth/sign-up')).status === 405, 'sign-up only accepts POST');
  const duplicate = await anonymous.post('/api/auth/sign-up', { username: 'alice', email: 'other@example.com', password: 'password123' });
  check(duplicate.status === 409 && duplicate.body.error.fields.username, 'usernames are unique (case-insensitive)', duplicate.body);
  check(data(await anonymous.get('/api/auth/username-available?username=alice')).available === false, 'username-available: taken');
  check(data(await anonymous.get('/api/auth/username-available?username=newname')).available === true, 'username-available: free');
  check(data(await anonymous.get('/api/auth/username-available?username=admin')).available === false, 'username-available: reserved');

  check((await new Client().signIn('alice', 'wrong-password')).user === undefined, 'wrong password does not sign in');
  check((await alice.signIn('ALICE@example.com', 'password123')).user?.username === 'alice', 'sign in with email');
  check((await bob.signIn('bob', 'password123')).user?.username === 'bob', 'sign in with username');
  check((await carol.signIn('carol', 'password123')).user?.username === 'carol', 'carol signs in');

  check(data(await alice.get('/api/me')).user.emailVerified === true, 'new accounts have a verified email');

  const profile = await bob.patch('/api/me', { displayName: 'Bob the Reader', bio: 'I read a lot.' });
  check(data(profile).user.displayName === 'Bob the Reader', 'update profile');
  check((await bob.patch('/api/me', { username: 'alice' })).status === 409, 'cannot take another username');
  check(data(await bob.upload('/api/me/avatar', pngHeader(300, 300))).avatar?.url, 'upload avatar');
  check(data(await bob.delete('/api/me/avatar')).avatar === null, 'remove avatar');

  console.log('\nChannels');
  const created = await alice.post('/api/channels', { handle: 'AliceTales', name: 'Alice Tales', description: 'Stories by Alice' });
  check(created.status === 201 && data(created).channel.handle === 'alicetales', 'create channel (handle lowercased)', created.body);
  check((await bob.post('/api/channels', { handle: 'alicetales', name: 'Copy' })).status === 409, 'channel handles are unique');
  check((await bob.patch('/api/channels/alicetales', { name: 'Hacked' })).status === 403, "others can't edit a channel");
  check(data(await alice.patch('/api/channels/alicetales', { description: 'Fantasy and more' })).channel.description === 'Fantasy and more', 'owner edits channel');
  check(data(await alice.upload('/api/channels/alicetales/banner', pngHeader(1600, 400))).banner?.url, 'upload channel banner');
  check((await alice.post('/api/channels/alicetales/subscribe')).status === 400, "can't subscribe to own channel");
  const subscribed = data(await bob.post('/api/channels/alicetales/subscribe'));
  check(subscribed.subscribed && subscribed.subscribers === 1, 'bob subscribes');
  check(data(await bob.post('/api/channels/alicetales/subscribe')).subscribers === 1, 'subscribing twice counts once');
  check((await waitForNotification(alice, 'new_subscriber')) !== null, 'alice is notified of the new subscriber');
  check(data(await bob.get('/api/channels/alicetales')).viewer.subscribed === true, 'channel shows viewer as subscribed');
  check(data(await bob.get('/api/me/subscriptions')).items[0]?.channel.handle === 'alicetales', 'my subscriptions');
  const channelId = data(await alice.get('/api/channels/alicetales')).channel.id;

  console.log('\nSeries: seasons and episodes');
  const seriesRes = await alice.post('/api/stories', {
    channelId,
    type: 'series',
    title: 'The Moon Archive',
    synopsis: 'A librarian finds a door to the moon.',
    genres: ['fantasy', 'mystery'],
    tags: ['Slow Burn', '#Magic', 'magic'],
    language: 'hi',
  });
  check(seriesRes.status === 201, 'create series (Hindi language code works with search)', seriesRes.body);
  const series = data(seriesRes).story;
  check(series.status === 'draft' && series.slug === 'the-moon-archive', 'series starts as a draft with a slug');
  check(JSON.stringify(series.tags) === '["slow-burn","magic"]', 'tags are normalized and de-duplicated', series.tags);
  check((await bob.get(`/api/stories/${series.id}`)).status === 404, 'drafts are hidden from readers');
  check((await bob.post('/api/stories', { channelId, type: 'single', title: 'x', genres: ['drama'] })).status === 403, "can't post in someone else's channel");

  const poster = data(await alice.upload(`/api/stories/${series.id}/poster`, pngHeader(1000, 1500))).poster;
  check(poster?.width === 1000 && poster.height === 1500, 'upload poster');
  const posterFile = await anonymous.get(poster.url);
  check(posterFile.status === 200 && posterFile.headers.get('content-type') === 'image/png', 'poster is served');
  check((await alice.upload(`/api/stories/${series.id}/poster`, Buffer.from('not an image'))).status === 415, 'non-images are rejected');
  check((await alice.upload(`/api/stories/${series.id}/poster`, pngHeader(20, 20))).status === 400, 'tiny images are rejected');

  let toc = data(await alice.get(`/api/stories/${series.id}/episodes`));
  check(toc.seasons.length === 1 && toc.seasons[0].episodes.length === 0, 'series starts with an empty Season 1');
  const season1 = toc.seasons[0].id;
  const season2Res = await alice.post(`/api/stories/${series.id}/seasons`, { title: 'The Dark Side' });
  check(season2Res.status === 201, 'add Season 2');
  const season2 = data(season2Res).season.id;

  const newEpisode = async (seasonId, title, content) => {
    const res = await alice.post(`/api/stories/${series.id}/episodes`, { seasonId, title, content });
    check(res.status === 201, `create episode "${title}"`, res.body);
    return data(res).episode;
  };
  const ep1 = await newEpisode(season1, 'The Door', '<p>Hello <script>alert(1)</script><strong>world</strong>.</p><img src=x onerror=alert(1)>');
  check(!ep1.content.includes('script') && !ep1.content.includes('img') && ep1.content.includes('<strong>world</strong>'), 'episode HTML is sanitized', ep1.content);
  check(ep1.wordCount === 2 && ep1.status === 'draft', 'word count is computed');
  const ep2 = await newEpisode(season1, 'The Stairs', '<p>She climbed the silver stairs for hours.</p>');
  const ep3 = await newEpisode(season2, 'Dark Water', '<p>Nothing here yet but a draft.</p>');
  const empty = await newEpisode(season2, 'Empty', '');

  check((await alice.post(`/api/stories/${series.id}/publish`)).status === 400, 'a series needs a published episode first');
  check((await alice.post(`/api/episodes/${empty.id}/publish`)).status === 400, "empty episodes can't be published");
  check(data(await alice.post(`/api/episodes/${ep1.id}/publish`)).episode.status === 'published', 'publish episode 1');
  const published = data(await alice.post(`/api/stories/${series.id}/publish`)).story;
  check(published.status === 'published' && published.stats.episodes === 1, 'publish the series');
  check((await waitForNotification(bob, 'new_story')) !== null, 'subscriber is notified of the new story');
  await alice.post(`/api/episodes/${ep2.id}/publish`);
  const episodeNote = await waitForNotification(bob, 'new_episode');
  check(episodeNote?.episode?.id === ep2.id && episodeNote.story.title === 'The Moon Archive', 'subscriber is notified of the new episode', episodeNote);

  console.log('\nReading');
  toc = data(await bob.get(`/api/stories/${series.id}/episodes`));
  check(toc.seasons.length === 1 && toc.seasons[0].episodes.length === 2, 'readers see only seasons with published episodes', toc);
  const reading = data(await bob.get(`/api/episodes/${ep1.id}`));
  check(reading.episode.content.includes('world') && reading.story.title === 'The Moon Archive', 'read episode with content');
  check(reading.navigation.previous === null && reading.navigation.next?.id === ep2.id, 'previous/next navigation');
  check(reading.season?.title === '' && reading.viewer.liked === false, 'episode includes season and viewer state');
  check((await bob.get(`/api/episodes/${ep3.id}`)).status === 404, 'draft episodes are hidden from readers');
  check((await alice.get(`/api/episodes/${ep3.id}`)).status === 200, 'author can preview drafts');

  check(data(await bob.post(`/api/episodes/${ep1.id}/view`)).counted === true, 'view counted');
  check(data(await bob.post(`/api/episodes/${ep1.id}/view`)).counted === false, 'repeat view within 24h not counted');
  check(data(await anonymous.post(`/api/episodes/${ep1.id}/view`)).counted === true, 'signed-out view counted');
  check(data(await alice.post(`/api/episodes/${ep1.id}/view`)).counted === false, "author's own view not counted");

  check(data(await bob.post(`/api/episodes/${ep1.id}/like`)).likes === 1, 'like episode');
  check(data(await bob.post(`/api/episodes/${ep1.id}/like`)).likes === 1, 'liking twice counts once');
  check(data(await bob.delete(`/api/episodes/${ep1.id}/like`)).likes === 0, 'unlike');
  await bob.post(`/api/episodes/${ep1.id}/like`);
  await carol.post(`/api/episodes/${ep1.id}/like`);
  check((await bob.post(`/api/episodes/${ep3.id}/like`)).status === 404, "can't like a hidden draft");

  console.log('\nComments');
  const commentRes = await bob.post(`/api/episodes/${ep1.id}/comments`, { body: 'Loved the opening!' });
  check(commentRes.status === 201 && data(commentRes).comment.author.username === 'bob', 'post a comment');
  const rootComment = data(commentRes).comment;
  check((await waitForNotification(alice, 'new_comment')) !== null, 'author is notified of the comment');
  const reply = data(await alice.post(`/api/episodes/${ep1.id}/comments`, { body: 'Thank you!', parentId: rootComment.id })).comment;
  check(reply.parentId === rootComment.id && reply.byStoryAuthor === true, 'author replies (marked as story author)');
  check((await waitForNotification(bob, 'comment_reply')) !== null, 'commenter is notified of the reply');
  const nested = data(await bob.post(`/api/episodes/${ep1.id}/comments`, { body: 'Cannot wait for more', parentId: reply.id })).comment;
  check(nested.parentId === rootComment.id, 'replies to replies join the top-level thread');
  const comments = data(await anonymous.get(`/api/episodes/${ep1.id}/comments`));
  check(comments.items.length === 1 && comments.items[0].replyCount === 2 && comments.total === 3, 'list comments', comments);
  check(data(await anonymous.get(`/api/comments/${rootComment.id}/replies`)).items.length === 2, 'list replies');
  check(data(await bob.patch(`/api/comments/${rootComment.id}`, { body: 'Loved the opening!!' })).comment.editedAt, 'edit own comment');
  check((await alice.patch(`/api/comments/${rootComment.id}`, { body: 'changed' })).status === 403, "can't edit others' comments");
  check((await carol.delete(`/api/comments/${nested.id}`)).status === 403, "readers can't delete others' comments");
  check((await alice.delete(`/api/comments/${nested.id}`)).status === 200, 'story author can moderate comments');
  check(data(await anonymous.get(`/api/episodes/${ep1.id}/comments`)).items[0].replyCount === 1, 'reply count updates');

  console.log('\nReviews, library, progress, feed');
  check((await alice.put(`/api/stories/${series.id}/reviews`, { rating: 5 })).status === 403, "can't review own story");
  check((await bob.put(`/api/stories/${series.id}/reviews`, { rating: 4, body: 'Great start.' })).status === 201, 'bob rates 4');
  const carolReview = await carol.put(`/api/stories/${series.id}/reviews`, { rating: 5 });
  check(data(carolReview).rating.average === 4.5 && data(carolReview).rating.count === 2, 'average rating 4.5', carolReview.body);
  const bobUpdate = await bob.put(`/api/stories/${series.id}/reviews`, { rating: 2, body: 'Changed my mind.' });
  check(bobUpdate.status === 200 && data(bobUpdate).rating.average === 3.5, 'updating a review re-averages');
  check(data(await anonymous.get(`/api/stories/${series.id}/reviews`)).items.length === 2, 'list reviews');
  check((await waitForNotification(alice, 'new_review')) !== null, 'author is notified of reviews');
  check((await carol.delete(`/api/reviews/${data(bobUpdate).review.id}`)).status === 403, "can't delete others' reviews");

  check(data(await bob.post(`/api/stories/${series.id}/library`)).saves === 1, 'save to library');
  check(data(await bob.get('/api/me/library')).items[0]?.story.id === series.id, 'library lists the story');
  check(data(await bob.put(`/api/stories/${series.id}/progress`, { episodeId: ep2.id, position: 0.4 })).progress.position === 0.4, 'save reading progress');
  check((await bob.put(`/api/stories/${series.id}/progress`, { episodeId: ep3.id, position: 0 })).status === 404, "progress can't point at hidden drafts");
  const history = data(await bob.get('/api/me/history')).items[0];
  check(history?.episode.id === ep2.id && history.position === 0.4, 'continue reading', history);
  const viewerState = data(await bob.get(`/api/stories/${series.id}`)).viewer;
  check(viewerState.inLibrary && viewerState.progress.episodeId === ep2.id && viewerState.review.rating === 2 && viewerState.subscribedToChannel, 'story shows viewer state', viewerState);
  check(data(await bob.get('/api/me/feed')).items[0]?.id === series.id, 'subscription feed');

  console.log('\nSingle stories and discovery');
  const singleRes = await alice.post('/api/stories', {
    channelId, type: 'single', title: 'A Short Night', genres: ['romance'], contentRating: 'mature', content: '<p>One short tale about the night.</p>',
  });
  check(singleRes.status === 201, 'create single story with its content');
  const single = data(singleRes).story;
  const singleToc = data(await alice.get(`/api/stories/${single.id}/episodes`));
  check(singleToc.seasons.length === 0 && singleToc.episodes.length === 1, 'single story has one episode and no seasons');
  check((await alice.post(`/api/stories/${single.id}/episodes`, { seasonId: season1, title: 'x' })).status === 400, "single stories can't get more episodes");
  check((await alice.post(`/api/episodes/${singleToc.episodes[0].id}/publish`)).status === 400, 'single episodes publish with the story');
  check(data(await alice.post(`/api/stories/${single.id}/publish`)).story.status === 'published', 'publish single story');
  check(data(await bob.get(`/api/episodes/${singleToc.episodes[0].id}`)).episode.content.includes('short tale'), 'read single story');
  check(data(await alice.patch(`/api/stories/${single.id}`, { title: 'A Very Short Night' })).story.slug === 'a-very-short-night', 'renaming updates the slug');
  check(data(await bob.get(`/api/episodes/${singleToc.episodes[0].id}`)).episode.title === 'A Very Short Night', "single story's episode follows the title");

  const ids = async (query) => data(await anonymous.get(`/api/stories${query}`)).items.map((story) => story.id);
  check((await ids('')).includes(series.id), 'discover lists published stories');
  check(!(await ids('')).includes(single.id), 'mature stories are hidden by default');
  check((await ids('?includeMature=true')).includes(single.id), '...and shown with includeMature=true');
  check((await ids('?genre=fantasy')).includes(series.id) && !(await ids('?genre=horror')).includes(series.id), 'filter by genre');
  check((await ids('?tag=Slow%20Burn')).includes(series.id), 'filter by tag');
  check((await ids('?q=moon')).includes(series.id), 'full-text search');
  check((await ids('?language=hi&type=series&sort=top-rated')).includes(series.id), 'filter by language and type, sort by rating');
  check((await anonymous.get('/api/stories?sort=nonsense')).status === 400, 'unknown sort is rejected');
  check(data(await anonymous.get('/api/channels?q=alice')).items[0]?.handle === 'alicetales', 'search channels');
  check(data(await anonymous.get('/api/channels/alicetales/stories')).items.length === 2, 'channel stories');
  check(data(await anonymous.get('/api/tags/popular')).items.some((item) => item.tag === 'magic'), 'popular tags');
  check(data(await anonymous.get('/api/options')).genres.length > 10, 'form options');
  check(data(await anonymous.get('/api/users/alice')).channels.length === 1, 'public profile with channels');

  console.log('\nOrdering and publishing rules');
  check((await alice.put(`/api/seasons/${season1}/episodes/order`, { order: [ep2.id] })).status === 400, 'reorder must list every episode');
  check((await alice.put(`/api/seasons/${season1}/episodes/order`, { order: [ep2.id, ep1.id] })).status === 200, 'reorder episodes');
  const reordered = data(await bob.get(`/api/episodes/${ep2.id}`)).navigation;
  check(reordered.previous === null && reordered.next?.id === ep1.id, 'navigation follows the new order', reordered);
  check((await alice.put(`/api/stories/${series.id}/seasons/order`, { order: [season2, season1] })).status === 200, 'reorder seasons');
  check(data(await alice.delete(`/api/episodes/${ep2.id}/publish`)).episode.status === 'draft', 'unpublish an episode');
  check((await alice.delete(`/api/episodes/${ep1.id}/publish`)).status === 400, "can't unpublish the last episode of a published series");
  check((await alice.delete(`/api/episodes/${ep1.id}`)).status === 400, "can't delete the last published episode either");

  console.log('\nNotifications');
  const inbox = data(await bob.get('/api/me/notifications'));
  check(inbox.unreadCount > 0, 'unread count');
  check(data(await bob.post('/api/me/notifications/read')).updated === inbox.unreadCount, 'mark all read');
  check(data(await bob.get('/api/me/notifications')).unreadCount === 0, 'nothing unread');

  console.log('\nPasswords');
  check((await bob.post('/api/me/password', { currentPassword: 'wrong', newPassword: 'newpassword1' })).status === 400, 'change password needs the current one');
  check((await bob.post('/api/me/password', { currentPassword: 'password123', newPassword: 'newpassword1' })).status === 200, 'change password');
  check((await new Client().signIn('bob', 'newpassword1')).user?.username === 'bob', 'sign in with the new password');
  check((await anonymous.post('/api/auth/forgot-password', { email: 'nobody@example.com' })).status === 200, 'forgot-password does not reveal accounts');
  const resetSince = logMark();
  check((await anonymous.post('/api/auth/forgot-password', { email: 'carol@example.com' })).status === 200, 'forgot-password emails a code');
  const resetCode = await emailedCode('carol@example.com', resetSince);
  const wrongReset = await anonymous.post('/api/auth/forgot-password/verify', { email: 'carol@example.com', code: otherCode(resetCode) });
  check(wrongReset.status === 400 && wrongReset.body.error.fields?.code, 'a wrong reset code is rejected', wrongReset.body);
  const resetToken = data(await anonymous.post('/api/auth/forgot-password/verify', { email: 'carol@example.com', code: resetCode }))?.token;
  check(Boolean(resetToken), 'the reset code gives a reset token');
  check((await anonymous.post('/api/auth/reset-password', { token: resetToken, password: 'carols-new-pass' })).status === 200, 'reset password');
  check((await new Client().signIn('carol', 'carols-new-pass')).user?.username === 'carol', 'sign in after reset');
  check((await anonymous.post('/api/auth/reset-password', { token: resetToken, password: 'another-pass' })).status === 400, 'reset tokens are single-use');
  check((await anonymous.post('/api/auth/forgot-password', { email: 'carol@example.com' })).status === 429, 'forgot-password works once a day');

  console.log('\nDeleting');
  check((await alice.delete(`/api/seasons/${season2}`)).status === 200, 'delete a season with its episodes');
  check((await alice.get(`/api/episodes/${ep3.id}`)).status === 404, "the season's episodes are gone");
  check((await bob.delete(`/api/stories/${series.id}`)).status === 403, "readers can't delete stories");
  check((await alice.delete(`/api/stories/${series.id}`)).status === 200, 'delete the series');
  check((await anonymous.get(`/api/stories/${series.id}`)).status === 404, 'story is gone');
  check((await anonymous.get(`/api/comments/${rootComment.id}/replies`)).status === 404, 'its comments are gone');
  check((await anonymous.get(poster.url)).status === 404, 'its poster file is deleted');
  check(data(await bob.get('/api/me/library')).items.length === 0, 'it left the library');
  check(data(await anonymous.get('/api/channels/alicetales')).channel.stats.stories === 1, 'channel story count updates');
  check((await alice.delete('/api/channels/alicetales')).status === 200, 'delete the channel');
  check((await anonymous.get(`/api/stories/${single.id}`)).status === 404, "the channel's stories are gone");
  check(data(await bob.get('/api/me/subscriptions')).items.length === 0, 'subscriptions are removed');
  check((await anonymous.get('/api/stories/not-an-id')).status === 404, 'malformed ids are 404');
}

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const env = {
  ...process.env,
  MONGODB_URI: replSet.getUri(),
  MONGODB_DB: 'smoke_test',
  NEXTAUTH_SECRET: 'smoke-test-secret',
  NEXTAUTH_URL: BASE,
  APP_URL: BASE,
  STORAGE_DRIVER: 'local',
  LOCAL_UPLOADS_DIR: UPLOADS_DIR,
  RESEND_API_KEY: '',
  GMAIL_USER: '', // no real emails: the dev server prints them for the test to read
  GMAIL_APP_PASSWORD: '',
  NODE_ENV: 'development',
  NEXT_DIST_DIR: '.next-smoke-test', // separate from a dev server you may have running
};
const server = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'dev', '--turbopack', '-p', String(PORT)], {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => serverLog.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverLog.push(chunk.toString()));

let failed = false;
try {
  console.log(`Starting Next.js on ${BASE} with an in-memory MongoDB...`);
  await waitForServer();
  await run();
  console.log(`\nAll ${passed} checks passed.`);
} catch (error) {
  failed = true;
  console.error(`\n${error.message}\n\nLast server output:\n${serverLog.join('').slice(-4000)}`);
} finally {
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // already gone
    }
  } else {
    server.kill('SIGTERM');
  }
  await replSet.stop();
  await rm(UPLOADS_DIR, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
