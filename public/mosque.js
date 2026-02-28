const apiUrl = 'https://your-worker-url.workers.dev/api'; // TODO: Replace with your worker URL

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mosqueId = urlParams.get('id');

  const mosqueName = document.getElementById('mosque-name');
  const mosqueDetails = document.getElementById('mosque-details');
  const eventsList = document.getElementById('events-list');
  const discussionsList = document.getElementById('discussions-list');
  const discussionForm = document.getElementById('discussion-form');

  // Fetch mosque details
  fetch(`${apiUrl}/mosques/${mosqueId}`)
    .then(response => response.json())
    .then(mosque => {
      mosqueName.textContent = mosque.name;
      mosqueDetails.innerHTML = `
        <p><strong>Description:</strong> ${mosque.description}</p>
        <p><strong>Info:</strong> ${mosque.info}</p>
        <p><strong>Date Constructed:</strong> ${mosque.date_constructed}</p>
        <p><strong>Location:</strong> ${mosque.latitude}, ${mosque.longitude}</p>
      `;
    })
    .catch(error => {
      console.error('Error fetching mosque details:', error);
      mosqueDetails.innerHTML = '<p>Error loading mosque details.</p>';
    });

  // Fetch mosque events
  fetch(`${apiUrl}/mosques/${mosqueId}/events`)
    .then(response => response.json())
    .then(events => {
      if (events.length === 0) {
        eventsList.innerHTML = '<p>No events found for this mosque.</p>';
        return;
      }
      events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.innerHTML = `
          <h4>${event.name}</h4>
          <p>${event.description}</p>
          <p><strong>Date:</strong> ${event.date}</p>
        `;
        eventsList.appendChild(eventElement);
      });
    })
    .catch(error => {
      console.error('Error fetching events:', error);
      eventsList.innerHTML = '<p>Error loading events.</p>';
    });

  // Fetch mosque discussions
    fetch(`${apiUrl}/mosques/${mosqueId}/discussions`)
        .then(response => response.json())
        .then(discussions => {
            if (discussions.length === 0) {
                discussionsList.innerHTML = '<p>No discussions found for this mosque.</p>';
                return;
            }
            discussions.forEach(discussion => {
                const discussionElement = document.createElement('div');
                discussionElement.innerHTML = `
                    <p><strong>${discussion.author}:</strong> ${discussion.message}</p>
                `;
                discussionsList.appendChild(discussionElement);
            });
        })
        .catch(error => {
            console.error('Error fetching discussions:', error);
            discussionsList.innerHTML = '<p>Error loading discussions.</p>';
        });

    // Handle new discussion form submission
    discussionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const author = document.getElementById('author').value;
        const message = document.getElementById('message').value;

        fetch(`${apiUrl}/discussions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mosque_id: mosqueId,
                author,
                message
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                location.reload();
            } else {
                alert('Error adding discussion');
            }
        })
        .catch(error => {
            console.error('Error adding discussion:', error);
            alert('Error adding discussion');
        });
    });
});
