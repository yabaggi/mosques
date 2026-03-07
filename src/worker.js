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

    // Serve SPA for non-API routes
    if (!path.startsWith('/api/')) {
      // env.ASSETS is available on Cloudflare Pages. In Workers dev mode,
      // the assets config intercepts static files before the Worker runs,
      // so this branch only fires for missing files (favicon.ico etc.).
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('', { status: 204 }); // silently swallow
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
       WHERE m.name LIKE ? OR m.name_ar LIKE ?
          OR m.description LIKE ? OR m.description_ar LIKE ?
       ORDER BY m.name`
    ).bind(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
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
  const { name, name_ar, description, description_ar, info, info_ar,
          latitude, longitude, date_constructed } = body;
  if (!name?.trim()) return err('name is required');

  const result = await env.DB.prepare(
    `INSERT INTO mosques
       (name, name_ar, description, description_ar, info, info_ar,
        latitude, longitude, date_constructed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    name.trim(), name_ar?.trim() || null,
    description || null, description_ar || null,
    info || null, info_ar || null,
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
    `SELECT * FROM events WHERE mosque_id = ? ORDER BY from_date ASC`
  ).bind(mosque_id).all();

  return json({ events: results });
}

async function postEvent(env, request) {
  const body = await request.json();
  const { mosque_id, name, name_ar, description, description_ar, from_date, to_date } = body;
  if (!mosque_id || !name) return err('mosque_id and name required');

  const result = await env.DB.prepare(
    `INSERT INTO events
       (mosque_id, name, name_ar, description, description_ar, from_date, to_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    mosque_id, name.trim(), name_ar?.trim() || null,
    description || null, description_ar || null,
    from_date || null, to_date || null
  ).run();

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

function blobToResponse(img, maxAge = 86400) {
  let body;

  if (typeof img === 'string') {
    // D1 local dev (some versions) returns BLOBs as base64 strings
    const binary = atob(img);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    body = bytes.buffer;
  } else if (img instanceof ArrayBuffer || ArrayBuffer.isView(img)) {
    // D1 production returns ArrayBuffer
    body = img;
  } else if (img && typeof img === 'object' && img.type === 'Buffer' && Array.isArray(img.data)) {
    // Some Wrangler versions return a Node Buffer-like object { type:'Buffer', data:[...] }
    body = new Uint8Array(img.data).buffer;
  } else if (Array.isArray(img)) {
    // Wrangler local dev (latest) returns BLOBs as a plain number array [255,216,255,...]
    body = new Uint8Array(img).buffer;
  } else if (img && typeof img === 'object') {
    // Fallback: treat any object with numeric keys as array-like
    const values = Object.values(img);
    if (values.length && typeof values[0] === 'number') {
      body = new Uint8Array(values).buffer;
    } else {
      return null;
    }
  } else {
    return null;
  }

  return new Response(body, {
    headers: corsHeaders({
      'Content-Type': 'image/jpeg',
      'Cache-Control': `public, max-age=${maxAge}`,
    }),
  });
}

async function serveImage(env, id) {
  const row = await env.DB.prepare(
    'SELECT img FROM imgs WHERE id = ?'
  ).bind(id).first();

  if (!row?.img) return err('Image not found', 404);

  const response = blobToResponse(row.img);
  if (!response) {
    console.error('Unknown img type:', typeof row.img, JSON.stringify(row.img)?.slice(0, 80));
    return err('Could not decode image', 500);
  }
  return response;
}

async function getFirstMosqueImage(env, mosqueId) {
  const row = await env.DB.prepare(
    'SELECT img FROM imgs WHERE mosque_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(mosqueId).first();

  if (!row?.img) return err('No image found', 404);

  const response = blobToResponse(row.img, 3600);
  if (!response) return err('Could not decode image', 500);
  return response;
}

async function uploadImage(env, request) {
  const contentType = request.headers.get('Content-Type') || '';

  let imageBuffer;
  let mosque_id;

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image');
      mosque_id = formData.get('mosque_id');

      if (!file) return err('image field missing from form data');
      if (!mosque_id) return err('mosque_id field missing from form data');

      imageBuffer = await file.arrayBuffer();

      console.log(`Upload received: mosque_id=${mosque_id}, size=${imageBuffer.byteLength} bytes`);

      if (imageBuffer.byteLength === 0) return err('Image is empty');
      if (imageBuffer.byteLength > 1024 * 1024) return err(`Image too large: ${imageBuffer.byteLength} bytes. Max 1 MiB.`);

    } else {
      // JSON base64 fallback
      const body = await request.json();
      mosque_id = body.mosque_id;
      const b64 = (body.image || '').replace(/^data:image\/[a-z]+;base64,/, '');
      if (!b64) return err('image (base64) is missing');
      if (!mosque_id) return err('mosque_id is missing');

      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      imageBuffer = bytes.buffer;

      if (imageBuffer.byteLength > 1024 * 1024) return err('Image too large. Max 1 MiB after compression.');
    }

    const result = await env.DB.prepare(
      `INSERT INTO imgs (mosque_id, img, created_at) VALUES (?, ?, datetime('now'))`
    ).bind(Number(mosque_id), imageBuffer).run();

    console.log(`Image stored: id=${result.meta.last_row_id}`);
    return json({ success: true, id: result.meta.last_row_id }, 201);

  } catch (e) {
    console.error('Upload error:', e.message, e.stack);
    return err('Upload failed: ' + e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════
// DISCUSS — Paginated Community Feed
// ═══════════════════════════════════════════════════════
async function getDiscuss(env, url) {
  const page  = parseInt(url.searchParams.get('page')  || '0', 10);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const offset = page * limit;

  const { results } = await env.DB.prepare(
    `SELECT id, author, author_ar, message, message_ar, created_at FROM discuss
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
  const { author, author_ar, message, message_ar } = body;
  if (!message?.trim()) return err('message is required');
  if (message.length > 2000) return err('message too long (max 2000 chars)');
  if ((author || '').length > 100) return err('author name too long');

  const result = await env.DB.prepare(
    `INSERT INTO discuss (author, author_ar, message, message_ar, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).bind(
    (author || 'Anonymous').trim(),
    author_ar?.trim() || null,
    message.trim(),
    message_ar?.trim() || null
  ).run();

  return json({ success: true, id: result.meta.last_row_id }, 201);
}
