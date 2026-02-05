import './style.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div>
    <h1>Dashboard Follow-Up Agent</h1>
    <button id="refresh-btn">Rafraîchir les données</button>
    
    <div class="tables-container">
      <section>
        <h2>Contacts</h2>
        <div class="table-wrapper">
          <table id="contacts-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>État</th>
                <th>Dernier Message</th>
                <th>Relance Prévue</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Messages</h2>
        <div class="table-wrapper">
          <table id="messages-table">
            <thead>
              <tr>
                <th>Contact ID</th>
                <th>Contenu</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
`

async function fetchData() {
  try {
    const [contactsRes, messagesRes] = await Promise.all([
      fetch(`${API_URL}/contact`),
      fetch(`${API_URL}/message`)
    ]);

    const contacts = await contactsRes.json();
    const messages = await messagesRes.json();

    renderContacts(contacts);
    renderMessages(messages);
  } catch (error) {
    console.error('Error fetching data:', error);
    alert(`Erreur lors de la récupération des données sur ${API_URL}. Vérifiez que le backend tourne bien sur ce port.`);
  }
}

function renderContacts(contacts: any[]) {
  const tbody = document.querySelector('#contacts-table tbody')!;
  tbody.innerHTML = contacts.map(c => `
    <tr>
      <td>${c.nom}</td>
      <td>${c.numero_telephone}</td>
      <td><span class="status-badge ${c.etat_contact}">${c.etat_contact}</span></td>
      <td>${c.lastMessageSentAt ? new Date(c.lastMessageSentAt).toLocaleString() : '-'}</td>
      <td>${c.followUpScheduledAt ? new Date(c.followUpScheduledAt).toLocaleString() : '-'}</td>
    </tr>
  `).join('');
}

function renderMessages(messages: any[]) {
  const tbody = document.querySelector('#messages-table tbody')!;
  // Sort messages by date descending
  const sortedMessages = messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  tbody.innerHTML = sortedMessages.map(m => `
    <tr>
      <td>${m.contact_id}</td>
      <td class="message-content" title="${m.contenu_message}">${m.contenu_message}</td>
      <td>${new Date(m.createdAt).toLocaleString()}</td>
    </tr>
  `).join('');
}

// Add some basic styles for the tables if not present in style.css
const style = document.createElement('style');
style.textContent = `
  .tables-container { display: flex; flex-direction: column; gap: 2rem; padding: 1rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #f4f4f4; color: #333; }
  .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-weight: bold; }
  .message-content { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
document.head.appendChild(style);

document.querySelector('#refresh-btn')?.addEventListener('click', fetchData);

// Initial fetch
fetchData();
