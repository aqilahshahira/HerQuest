import HerQuestNav from '../components/HerQuestNav';

const threads = [
  {
    name: 'Puan Intan S.',
    job: 'Post-Partum Confinement Meal Prep Cook',
    status: 'Applied 2 hrs ago',
    messages: [
      { sender: 'You', text: 'Salam Puan Intan! I applied for your confinement cooking quest.' },
      { sender: 'Puan Intan S.', text: 'Thank you! Are you available to start this Monday in PJ?' },
    ],
  },
  {
    name: 'Nurul Hidayah',
    job: 'One-Time Driver: Student Campus Ride',
    status: 'New message',
    messages: [
      { sender: 'You', text: 'Hi Kak Nurul! I submitted my application for the Sunday drop-off.' },
      { sender: 'Nurul Hidayah', text: 'Perfect. Pickup is at Taman Connaught Cheras.' },
    ],
  },
];

export default function ChatHubPage() {
  return (
    <>
      <HerQuestNav active="chathub" />

      <main className="page-shell">
        <section className="page-banner banner-teal">
          <div>
            <span className="eyebrow">Direct Applicant Chat</span>
            <h1>Applicant Inbox & Owner Discussions</h1>
            <p>Discuss schedule, dietary needs, routes, or budget directly with the quest owner.</p>
          </div>
        </section>

        <section className="chat-layout">
          <aside className="chat-sidebar">
            {threads.map((thread) => (
              <div key={thread.name} className="thread-item active">
                <div className="avatar">{thread.name.charAt(0)}</div>
                <div>
                  <strong>{thread.name}</strong>
                  <p>{thread.job}</p>
                  <small>{thread.status}</small>
                </div>
              </div>
            ))}
          </aside>

          <div className="chat-panel">
            <div className="chat-header">
              <div>
                <h2>Puan Intan S.</h2>
                <span>Quest: Post-Partum Confinement Meal Prep Cook</span>
              </div>
              <button className="primary-button small">WhatsApp Owner</button>
            </div>

            <div className="chat-thread">
              {threads[0].messages.map((message, index) => (
                <div key={index} className={message.sender === 'You' ? 'bubble you' : 'bubble'}>
                  <span>{message.sender}</span>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <div className="chat-input-row">
              <input type="text" placeholder="Type your message to quest owner..." />
              <button className="primary-button small">Send</button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
