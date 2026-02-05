import './app.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

document.title = 'Twilio_API_Agent_Whatsapp';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <header class="header">
    <h1>
      <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" data-view-component="true" style="fill: var(--fg-default);">
        <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
      </svg>
      Twilio_API_Agent_Whatsapp
    </h1>
    <button id="refresh-btn">Rafraîchir les données</button>
  </header>
  
  <div class="main-content">
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

document.querySelector('#refresh-btn')?.addEventListener('click', fetchData);

// Initial fetch
fetchData();
