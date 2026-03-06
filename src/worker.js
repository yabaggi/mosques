/**
 * Masjid Community App — Cloudflare Worker
 * Handles all API routes + serves the SPA
 *
 * Routes:
 *   GET  /api/mosques           — list all mosques
 *   POST /api/mosques           — add a mosque
 *   GET  /api/mosques/:id       — get single mosque
 *   GET  /api/events?mosque_id= — list events for a mosque
 *   POST /api/events            — add an event
 *   GET  /api/images?mosque_id= — list image metadata for a mosque
 *   GET  /api/image/:id         — serve image binary (JPEG)
 *   GET  /api/image/mosque/:id/first — first image for mosque (used in card)
 *   POST /api/upload            — compress+store image blob
 *   GET  /api/discuss?page=&limit= — paginated community feed
 *   POST /api/discuss           — post a community message
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function corsHeaders(extra = {}) {
  return { ...CORS, ...extra };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({ 'Content-Type': 'application/json' }),
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ─── Router ───────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ── Serve SPA for non-API routes ──
    if (!path.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      // ── /api/mosques ──────────────────────────────────
      if (path === '/api/mosques') {
        if (method === 'GET') return await getMosques(env, url);
        if (method === 'POST') return await postMosque(env, request);
      }

      // ── /api/mosques/:id ──────────────────────────────
      const mosqueMatch = path.match(/^\/api\/mosques\/(\d+)$/);
      if (mosqueMatch) {
        const id = mosqueMatch[1];
        if (method === 'GET') return await getMosque(env, id);
      }

      // ── /api/events ───────────────────────────────────
      if (path === '/api/events') {
        if (method === 'GET') return await getEvents(env, url);
        if (method === 'POST') return await postEvent(env, request);
      }

      // ── /api/images ───────────────────────────────────
      if (path === '/api/images') {
        if (method === 'GET') return await getImages(env, url);
      }

      // ── /api/image/mosque/:id/first ───────────────────
      const firstImgMatch = path.match(/^\/api\/image\/mosque\/(\d+)\/first$/);
      if (firstImgMatch) {
        return await getFirstMosqueImage(env, firstImgMatch[1]);
      }

      // ── /api/image/:id ────────────────────────────────
      const imgMatch = path.match(/^\/api\/image\/(\d+)$/);
      if (imgMatch) {
        return await serveImage(env, imgMatch[1]);
      }

      // ── /api/upload ───────────────────────────────────
      if (path === '/api/upload' && method === 'POST') {
        return await uploadImage(env, request);
      }

      // ── /api/discuss ──────────────────────────────────
      if (path === '/api/discuss') {
        if (method === 'GET') return await getDiscuss(env, url);
        if (method === 'POST') return await postDiscuss(env, request);
      }

      return err('Not found', 404);
    } catch (e) {
      console.error(e);
      return err('Internal server error: ' + e.message, 500);
    }
  },
};

// ═══════════════════════════════════════════════════════
// MOSQUES
// ═══════════════════════════════════════════════════════
async function getMosques(env, url) {
  const q = url.searchParams.get('q') || '';
  let stmt;
  if (q) {
    stmt = env.DB.prepare(
      `SELECT m.*, (SELECT COUNT(*) FROM imgs WHERE mosque_id = m.id) > 0 AS has_image
       FROM mosques m
       WHERE m.name LIKE ? OR m.description LIKE ?
       ORDER BY m.name`
    ).bind(`%${q}%`, `%${q}%`);
  } else {
    stmt = env.DB.prepare(
      `SELECT m.*, (SELECT COUNT(*) FROM imgs WHERE mosque_id = m.id) > 0 AS has_image
       FROM mosques m ORDER BY m.name`
    );
  }
  const { results } = await stmt.all();
  return json({ mosques: results });
}

async function getMosque(env, id) {
  const mosque = await env.DB.prepare(
    'SELECT * FROM mosques WHERE id = ?'
  ).bind(id).first();
  if (!mosque) return err('Mosque not found', 404);
  return json({ mosque });
}

async function postMosque(env, request) {
  const body = await request.json();
  const { name, description, info, latitude, longitude, date_constructed } = body;
  if (!name?.trim()) return err('name is required');

  const result = await env.DB.prepare(
    `INSERT INTO mosques (name, description, info, latitude, longitude, date_constructed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    name.trim(), description || null, info || null,
    latitude || null, longitude || null, date_constructed || null
  ).run();

  return json({ success: true, id: result.meta.last_row_id }, 201);
}

// ═══════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════
async function getEvents(env, url) {
  const mosque_id = url.searchParams.get('mosque_id');
  if (!mosque_id) return err('mosque_id required');

  const { results } = await env.DB.prepare(
    `SELECT * FROM events WHERE mosque_id = ? ORDER BY date ASC`
  ).bind(mosque_id).all();

  return json({ events: results });
}

async function postEvent(env, request) {
  const body = await request.json();
  const { mosque_id, name, description, date } = body;
  if (!mosque_id || !name) return err('mosque_id and name required');

  const result = await env.DB.prepare(
    `INSERT INTO events (mosque_id, name, description, date, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).bind(mosque_id, name.trim(), description || null, date || null).run();

  return json({ success: true, id: result.meta.last_row_id }, 201);
}

// ═══════════════════════════════════════════════════════
// IMAGES
// ═══════════════════════════════════════════════════════
async function getImages(env, url) {
  const mosque_id = url.searchParams.get('mosque_id');
  if (!mosque_id) return err('mosque_id required');

  // Return metadata only (not the blob — that's fetched per /image/:id)
  const { results } = await env.DB.prepare(
    `SELECT id, mosque_id, created_at FROM imgs WHERE mosque_id = ? ORDER BY created_at DESC`
  ).bind(mosque_id).all();

  return json({ images: results });
}

async function serveImage(env, id) {
  const row = await env.DB.prepare(
    'SELECT img FROM imgs WHERE id = ?'
  ).bind(id).first();

  if (!row?.img) return err('Image not found', 404);

  // D1 returns BLOBs as ArrayBuffer
  return new Response(row.img, {
    headers: corsHeaders({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    }),
  });
}

async function getFirstMosqueImage(env, mosqueId) {
  const row = await env.DB.prepare(
    'SELECT img FROM imgs WHERE mosque_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(mosqueId).first();

  if (!row?.img) return err('No image found', 404);

  return new Response(row.img, {
    headers: corsHeaders({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
    }),
  });
}

async function uploadImage(env, request) {
  const contentType = request.headers.get('Content-Type') || '';

  let imageBlob;
  let mosque_id;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('image');
    mosque_id = formData.get('mosque_id');

    if (!file || !mosque_id) return err('image and mosque_id required');
    if (file.size > 1024 * 1024) return err('Image too large. Max 1 MiB after compression.');

    imageBlob = await file.arrayBuffer();
  } else {
    // JSON base64 fallback
    const body = await request.json();
    mosque_id = body.mosque_id;
    const b64 = body.image;
    if (!b64 || !mosque_id) return err('image (base64) and mosque_id required');
    const binaryStr = atob(b64.replace(/^data:image\/[a-z]+;base64,/, ''));
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    imageBlob = bytes.buffer;
    if (imageBlob.byteLength > 1024 * 1024) return err('Image too large. Max 1 MiB after compression.');
  }

  const result = await env.DB.prepare(
    `INSERT INTO imgs (mosque_id, img, created_at) VALUES (?, ?, datetime('now'))`
  ).bind(mosque_id, imageBlob).run();

  return json({ success: true, id: result.meta.last_row_id }, 201);
}

// ═══════════════════════════════════════════════════════
// DISCUSS — Paginated Community Feed
// ═══════════════════════════════════════════════════════
async function getDiscuss(env, url) {
  const page  = parseInt(url.searchParams.get('page')  || '0', 10);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const offset = page * limit;

  const { results } = await env.DB.prepare(
    `SELECT id, author, message, created_at FROM discuss
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  const { count } = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM discuss'
  ).first();

  return json({
    messages: results,
    page,
    limit,
    total: count,
    hasMore: offset + results.length < count,
  });
}

async function postDiscuss(env, request) {
  const body = await request.json();
  const { author, message } = body;
  if (!message?.trim()) return err('message is required');
  if (message.length > 2000) return err('message too long (max 2000 chars)');
  if ((author || '').length > 100) return err('author name too long');

  const result = await env.DB.prepare(
    `INSERT INTO discuss (author, message, created_at) VALUES (?, ?, datetime('now'))`
  ).bind((author || 'Anonymous').trim(), message.trim()).run();

  return json({ success: true, id: result.meta.last_row_id }, 201);
}

