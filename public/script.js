const apiUrl = 'https://your-worker-url.workers.dev/api'; // TODO: Replace with your worker URL

document.addEventListener('DOMContentLoaded', () => {
  const mosquesList = document.getElementById('mosques-list');

  fetch(`${apiUrl}/mosques`)
    .then(response => response.json())
    .then(mosques => {
      mosques.forEach(mosque => {
        const mosqueCard = document.createElement('div');
        mosqueCard.classList.add('mosque-card');
        mosqueCard.innerHTML = `
          <h3>${mosque.name}</h3>
          <p>${mosque.description}</p>
        `;
        mosqueCard.addEventListener('click', () => {
          window.location.href = `mosque.html?id=${mosque.id}`;
        });
        mosquesList.appendChild(mosqueCard);
      });
    })
    .catch(error => {
      console.error('Error fetching mosques:', error);
      mosquesList.innerHTML = '<p>Error loading mosques. Please try again later.</p>';
    });
});
