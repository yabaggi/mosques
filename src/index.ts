import { Hono } from 'hono'
import { Mosque, Event, Discussion } from './types'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

// Mosques API
const mosques = new Hono<{ Bindings: Bindings }>()

// GET /api/mosques
mosques.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM mosques').all<Mosque>()
  return c.json(results)
})

// GET /api/mosques/:id
mosques.get('/:id', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare('SELECT * FROM mosques WHERE id = ?').bind(id).first<Mosque>()
  if (!result) {
    return c.json({ error: 'Mosque not found' }, 404)
  }
  return c.json(result)
})

// POST /api/mosques
mosques.post('/', async (c) => {
  const { name, description, info, date_constructed, latitude, longitude } = await c.req.json()
  const { success } = await c.env.DB.prepare(
    'INSERT INTO mosques (name, description, info, date_constructed, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(name, description, info, date_constructed, latitude, longitude)
    .run()

  if (success) {
    return c.json({ message: 'Mosque created successfully' })
  } else {
    return c.json({ error: 'Failed to create mosque' }, 500)
  }
})

// PUT /api/mosques/:id
mosques.put('/:id', async (c) => {
  const id = c.req.param('id')
  const { name, description, info, date_constructed, latitude, longitude } = await c.req.json()
  const { success } = await c.env.DB.prepare(
    'UPDATE mosques SET name = ?, description = ?, info = ?, date_constructed = ?, latitude = ?, longitude = ? WHERE id = ?'
  )
    .bind(name, description, info, date_constructed, latitude, longitude, id)
    .run()

  if (success) {
    return c.json({ message: 'Mosque updated successfully' })
  } else {
    return c.json({ error: 'Failed to update mosque' }, 500)
  }
})

// DELETE /api/mosques/:id
mosques.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const { success } = await c.env.DB.prepare('DELETE FROM mosques WHERE id = ?').bind(id).run()

  if (success) {
    return c.json({ message: 'Mosque deleted successfully' })
  } else {
    return c.json({ error: 'Failed to delete mosque' }, 500)
  }
})

// GET /api/mosques/:id/events
mosques.get('/:id/events', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare('SELECT * FROM events WHERE mosque_id = ?').bind(id).all<Event>()
  return c.json(results)
})

app.route('/api/mosques', mosques)

// Events API
const events = new Hono<{ Bindings: Bindings }>()

// GET /api/events
events.get('/', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM events').all<Event>()
    return c.json(results)
})

// GET /api/events/:id
events.get('/:id', async (c) => {
    const id = c.req.param('id')
    const result = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<Event>()
    if (!result) {
        return c.json({ error: 'Event not found' }, 404)
    }
    return c.json(result)
})

// POST /api/events
events.post('/', async (c) => {
    const { mosque_id, name, description, date } = await c.req.json()
    const { success } = await c.env.DB.prepare(
        'INSERT INTO events (mosque_id, name, description, date) VALUES (?, ?, ?, ?)'
    )
        .bind(mosque_id, name, description, date)
        .run()

    if (success) {
        return c.json({ message: 'Event created successfully' })
    } else {
        return c.json({ error: 'Failed to create event' }, 500)
    }
})

// PUT /api/events/:id
events.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { name, description, date } = await c.req.json()
    const { success } = await c.env.DB.prepare(
        'UPDATE events SET name = ?, description = ?, date = ? WHERE id = ?'
    )
        .bind(name, description, date, id)
        .run()

    if (success) {
        return c.json({ message: 'Event updated successfully' })
    } else {
        return c.json({ error: 'Failed to update event' }, 500)
    }
})

// DELETE /api/events/:id
events.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run()

    if (success) {
        return c.json({ message: 'Event deleted successfully' })
    } else {
        return c.json({ error: 'Failed to delete event' }, 500)
    }
})

app.route('/api/events', events)

// Discussions API
const discussions = new Hono<{ Bindings: Bindings }>()

// GET /api/discussions
discussions.get('/', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM discussions').all<Discussion>()
    return c.json(results)
})

// GET /api/discussions/:id
discussions.get('/:id', async (c) => {
    const id = c.req.param('id')
    const result = await c.env.DB.prepare('SELECT * FROM discussions WHERE id = ?').bind(id).first<Discussion>()
    if (!result) {
        return c.json({ error: 'Discussion not found' }, 404)
    }
    return c.json(result)
})

// POST /api/discussions
discussions.post('/', async (c) => {
    const { mosque_id, author, message } = await c.req.json()
    const { success } = await c.env.DB.prepare(
        'INSERT INTO discussions (mosque_id, author, message) VALUES (?, ?, ?)'
    )
        .bind(mosque_id, author, message)
        .run()

    if (success) {
        return c.json({ message: 'Discussion created successfully' })
    } else {
        return c.json({ error: 'Failed to create discussion' }, 500)
    }
}
)

// PUT /api/discussions/:id
discussions.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { author, message } = await c.req.json()
    const { success } = await c.env.DB.prepare(
        'UPDATE discussions SET author = ?, message = ? WHERE id = ?'
    )
        .bind(author, message, id)
        .run()
    
    if (success) {
        return c.json({ message: 'Discussion updated successfully' })
    } else {
        return c.json({ error: 'Failed to update discussion' }, 500)
    }
})

// DELETE /api/discussions/:id
discussions.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM discussions WHERE id = ?').bind(id).run()

    if (success) {
        return c.json({ message: 'Discussion deleted successfully' })
    } else {
        return c.json({ error: 'Failed to delete discussion' }, 500)
    }
})

app.route('/api/discussions', discussions)

export default app
