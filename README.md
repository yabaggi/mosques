# 🕌 Masjid — Mosque Community App

A mobile-first community app for mosque information, events, and global discussion. Built on **Cloudflare Workers** + **D1 Database** with zero external dependencies.

---

## 📁 Project Structure

```
mosque-app/
├── public/
│   └── index.html          ← Full SPA (HTML + CSS + JS, single file)
├── src/
│   └── worker.js           ← Cloudflare Worker (all API routes)
├── schema.sql              ← D1 database schema + seed data
├── wrangler.toml           ← Wrangler config (Workers + D1 bindings)
├── package.json
└── README.md
```

---

## 🚀 Quick Start (Termux / Linux)

### 1. Install Node.js & Wrangler

```bash
# In Termux
pkg update && pkg install nodejs
npm install -g wrangler

# Verify
wrangler --version
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
# Opens browser — log in with your Cloudflare account
```

### 3. Create the D1 Database

```bash
wrangler d1 create mosquesdb
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding      = "DB"
database_name = "mosquesdb"
database_id  = "PASTE_YOUR_ID_HERE"
```

### 4. Apply Schema & Seed Data

```bash
# Local (dev)
npm run db:migrate

# Remote (production)
npm run db:migrate:remote
```

### 5. Run Locally

```bash
npm run dev
# → http://localhost:8787
```

### 6. Deploy to Cloudflare

```bash
# Deploy as a Worker (with static assets)
npm run deploy

# OR deploy to Cloudflare Pages
npm run pages:deploy
```

---

## 🗄️ Database Schema

### `mosques` — Master Table
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Required |
| description | TEXT | Short blurb |
| info | TEXT | Detailed info |
| date_constructed | TEXT | e.g. "1984" or "632 CE" |
| latitude | REAL | For map |
| longitude | REAL | For map |
| created_at | TEXT | ISO datetime |

### `events` — Linked to Mosque
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| mosque_id | INTEGER FK | → mosques.id |
| name | TEXT | Event name |
| description | TEXT | |
| date | TEXT | ISO 8601 |
| created_at | TEXT | |

### `imgs` — Image BLOBs (linked to mosque)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| mosque_id | INTEGER FK | → mosques.id |
| img | BLOB | JPEG binary ≤ 0.8 MiB |
| created_at | TEXT | |

> ⚠️ **D1 1 MiB row limit**: The browser Canvas compressor automatically downscales images before upload.

### `discuss` — Global Community Feed
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| author | TEXT | Display name |
| message | TEXT | Max 2000 chars |
| created_at | TEXT | Used for pagination |

---

## 🌐 API Reference

All endpoints support CORS (including OPTIONS preflight).

### Mosques
```
GET  /api/mosques              → { mosques: [...] }
GET  /api/mosques?q=mecca      → filtered search
GET  /api/mosques/:id          → { mosque: {...} }
POST /api/mosques              → { success, id }
     Body: { name, description, info, latitude, longitude, date_constructed }
```

### Events
```
GET  /api/events?mosque_id=1   → { events: [...] }
POST /api/events               → { success, id }
     Body: { mosque_id, name, description, date }
```

### Images
```
GET  /api/images?mosque_id=1   → { images: [{id, mosque_id, created_at}] }
GET  /api/image/:id            → JPEG binary
GET  /api/image/mosque/:id/first → first JPEG for mosque (used in cards)
POST /api/upload               → { success, id }
     Body: multipart/form-data with fields: image (file), mosque_id
     OR: JSON with { image: "base64...", mosque_id }
```

### Community Discuss
```
GET  /api/discuss?page=0&limit=20  → { messages, page, limit, total, hasMore }
POST /api/discuss                  → { success, id }
     Body: { author, message }
```

---

## 🖼️ Image Compression (Canvas API)

The browser-side compressor in `index.html` (`compressImage()`) works as follows:

1. User selects a photo (any format, any size)
2. Canvas API loads the image and downscales to max 1200×1200px
3. Exports as JPEG at quality 0.82, iterating down if needed
4. Final blob guaranteed ≤ 0.8 MiB (safely under D1's 1 MiB row limit)
5. Uploaded via `multipart/form-data` XHR with real progress bar

---

## 📱 Features

| Feature | Details |
|---------|---------|
| **Home** | Searchable list + Leaflet.js map of all mosques |
| **Mosque Detail** | Description, info, gallery, events, mini-map |
| **Gallery** | Grid of uploaded photos with lightbox |
| **Events** | Upcoming events per mosque |
| **Community Hub** | Paginated global discussion board (20/page) |
| **Contribute** | Camera/file upload with automatic compression |
| **Add Mosque** | Form to add new mosques to the database |
| **CORS** | All OPTIONS preflight handled |
| **Mobile-first** | Tailwind-style CSS, safe-area-inset, touch-optimized |

---

## 🔧 Troubleshooting (Termux)

**"wrangler: command not found"**
```bash
export PATH="$PATH:$(npm bin -g)"
# or add to ~/.bashrc
```

**D1 BLOB storage issues**
```bash
# Verify D1 binding in wrangler.toml matches env.DB in worker.js
# Check: wrangler d1 execute mosquesdb --command "SELECT COUNT(*) FROM imgs"
```

**Image serving returns 404**
```bash
# Check if images were inserted
wrangler d1 execute mosquesdb --command "SELECT id, mosque_id, length(img) FROM imgs"
```

**CORS errors on mobile**
- All routes return `Access-Control-Allow-Origin: *`
- OPTIONS preflight handled before routing
- If behind a reverse proxy, ensure it doesn't strip CORS headers

---

## 🌙 Design

- **Palette**: Sand cream `#F5EFE0`, Teal `#1E5F5A`, Gold `#C9893A`
- **Fonts**: Amiri (Arabic-inspired serif) + DM Sans
- **Icons**: Inline SVG (zero external icon library needed)
- **Maps**: Leaflet.js (OpenStreetMap tiles, free)
- **No framework**: Pure HTML/CSS/JS SPA — works in any browser including Termux/Chrome

---

## 📄 License

MIT — free for community and educational use.

