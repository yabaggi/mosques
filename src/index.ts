import { Hono } from 'hono'
import { Mosque, Event, Discussion } from './types'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

// Serve static HTML pages
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mosques in Oman</title>
  <style>
body {
  font-family: sans-serif;
  margin: 0;
  background-color: #f4f4f4;
}
header {
  background-color: #333;
  color: #fff;
  padding: 1rem;
  text-align: center;
}
main {
  padding: 1rem;
}
#mosques-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
.mosque-card {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 1rem;
  cursor: pointer;
}
.mosque-card:hover {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
  </style>
</head>
<body>
  <header>
    <h1>Mosques in Oman</h1>
  </header>
  <main>
    <div id="mosques-list"></div>
  </main>
  <script>
const apiUrl = '/api';
document.addEventListener('DOMContentLoaded', () => {
  const mosquesList = document.getElementById('mosques-list');
  fetch(apiUrl + '/mosques')
    .then(response => response.json())
    .then(mosques => {
      mosques.forEach(mosque => {
        const mosqueCard = document.createElement('div');
        mosqueCard.classList.add('mosque-card');
        mosqueCard.innerHTML = '<h3>' + mosque.name + '</h3><p>' + mosque.description + '</p>';
        mosqueCard.addEventListener('click', () => {
          window.location.href = '/mosque?id=' + mosque.id;
        });
        mosquesList.appendChild(mosqueCard);
      });
    })
    .catch(error => {
      console.error('Error fetching mosques:', error);
      mosquesList.innerHTML = '<p>Error loading mosques. Please try again later.</p>';
    });
});
  </script>
</body>
</html>`

const mosqueHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mosque Details</title>
  <style>
body {
  font-family: sans-serif;
  margin: 0;
  background-color: #f4f4f4;
}
header {
  background-color: #333;
  color: #fff;
  padding: 1rem;
  text-align: center;
}
main {
  padding: 1rem;
}
  </style>
</head>
<body>
  <header>
    <h1 id="mosque-name"></h1>
  </header>
  <main>
    <div id="mosque-details"></div>
    <h2>Events</h2>
    <div id="events-list"></div>
    <h2>Discussions</h2>
    <div id="discussions-list"></div>
    <div id="add-discussion">
        <h3>Add Discussion</h3>
        <form id="discussion-form">
            <input type="text" id="author" placeholder="Your name" required>
            <textarea id="message" placeholder="Your message" required></textarea>
            <button type="submit">Submit</button>
        </form>
    </div>
  </main>
  <script>
const apiUrl = '/api';
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mosqueId = urlParams.get('id');
  const mosqueName = document.getElementById('mosque-name');
  const mosqueDetails = document.getElementById('mosque-details');
  const eventsList = document.getElementById('events-list');
  const discussionsList = document.getElementById('discussions-list');
  const discussionForm = document.getElementById('discussion-form');

  fetch(apiUrl + '/mosques/' + mosqueId)
    .then(response => response.json())
    .then(mosque => {
      mosqueName.textContent = mosque.name;
      mosqueDetails.innerHTML =
        '<p><strong>Description:</strong> ' + mosque.description + '</p>' +
        '<p><strong>Info:</strong> ' + mosque.info + '</p>' +
        '<p><strong>Date Constructed:</strong> ' + mosque.date_constructed + '</p>' +
        '<p><strong>Location:</strong> ' + mosque.latitude + ', ' + mosque.longitude + '</p>';
    })
    .catch(error => {
      console.error('Error fetching mosque details:', error);
      mosqueDetails.innerHTML = '<p>Error loading mosque details.</p>';
    });

  fetch(apiUrl + '/mosques/' + mosqueId + '/events')
    .then(response => response.json())
    .then(events => {
      if (events.length === 0) {
        eventsList.innerHTML = '<p>No events found for this mosque.</p>';
        return;
      }
      events.forEach(event => {
        const el = document.createElement('div');
        el.innerHTML = '<h4>' + event.name + '</h4><p>' + event.description + '</p><p><strong>Date:</strong> ' + event.date + '</p>';
        eventsList.appendChild(el);
      });
    })
    .catch(error => {
      console.error('Error fetching events:', error);
      eventsList.innerHTML = '<p>Error loading events.</p>';
    });

  fetch(apiUrl + '/mosques/' + mosqueId + '/discussions')
    .then(response => response.json())
    .then(discussions => {
      if (discussions.length === 0) {
        discussionsList.innerHTML = '<p>No discussions found for this mosque.</p>';
        return;
      }
      discussions.forEach(discussion => {
        const el = document.createElement('div');
        el.innerHTML = '<p><strong>' + discussion.author + ':</strong> ' + discussion.message + '</p>';
        discussionsList.appendChild(el);
      });
    })
    .catch(error => {
      console.error('Error fetching discussions:', error);
      discussionsList.innerHTML = '<p>Error loading discussions.</p>';
    });

  discussionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const author = document.getElementById('author').value;
    const message = document.getElementById('message').value;
    fetch(apiUrl + '/discussions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mosque_id: mosqueId, author, message })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message) { location.reload(); }
      else { alert('Error adding discussion'); }
    })
    .catch(error => {
      console.error('Error adding discussion:', error);
      alert('Error adding discussion');
    });
  });
});
  </script>
</body>
</html>`

app.get('/', (c) => c.html(indexHtml))
app.get('/mosque', (c) => c.html(mosqueHtml))

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
