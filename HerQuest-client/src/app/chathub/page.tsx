'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import HerQuestNav from '../components/HerQuestNav';
import { getApiBaseUrl } from '../../lib/api';

type ApplicationThread = {
  id: string;
  status: string;
  applied_at: string;
  quests: {
    title: string;
    owner: {
      full_name: string;
      phone_number: string | null;
    } | null;
  } | null;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export default function ChatHubPage() {
  const [threads, setThreads] = useState<ApplicationThread[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    async function loadCurrentUser() {
      const token = localStorage.getItem('herquest_token');
      if (!token) return;
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json() as { data?: { id: string } };
        if (response.ok) setCurrentUserId(result.data?.id ?? '');
      } catch {
        setCurrentUserId('');
      }
    }
    void loadCurrentUser();
  }, []);

  useEffect(() => {
    async function loadApplications() {
      const token = localStorage.getItem('herquest_token');
      if (!token) {
        setLoadError('Please log in to view your applicant conversations.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/applications/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json() as {
          data?: ApplicationThread[];
          message?: string;
        };
        if (!response.ok) throw new Error(result.message || 'Unable to load applications.');
        const applications = result.data ?? [];
        setThreads(applications);
        setSelectedId(applications[0]?.id ?? '');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load applications.');
      } finally {
        setLoading(false);
      }
    }
    void loadApplications();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let isCurrent = true;

    async function loadMessages() {
      const token = localStorage.getItem('herquest_token');
      if (!token) return;
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/conversations/${selectedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json() as {
          data?: { messages?: ChatMessage[] };
          message?: string;
        };
        if (!response.ok) throw new Error(result.message || 'Unable to load messages.');
        if (isCurrent) setMessages(result.data?.messages ?? []);
      } catch (error) {
        if (isCurrent) setMessageError(error instanceof Error ? error.message : 'Unable to load messages.');
      }
    }

    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 5000);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, [selectedId]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !messageText.trim()) return;

    const token = localStorage.getItem('herquest_token');
    if (!token) {
      setMessageError('Please log in to send messages.');
      return;
    }

    setSending(true);
    setMessageError('');
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/conversations/${selectedId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: messageText.trim() }),
        },
      );
      const result = await response.json() as { data?: ChatMessage; message?: string };
      if (!response.ok) throw new Error(result.message || 'Unable to send message.');
      if (result.data) setMessages((current) => [...current, result.data as ChatMessage]);
      setMessageText('');
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  }

  const selected = threads.find((thread) => thread.id === selectedId) ?? threads[0];
  const ownerName = selected?.quests?.owner?.full_name || 'Quest owner';
  const ownerPhone = selected?.quests?.owner?.phone_number?.replace(/\D/g, '') || '';
  const whatsappUrl = ownerPhone
    ? `https://wa.me/${ownerPhone}?text=${encodeURIComponent(
        `Salam / Hi ${ownerName}! I applied for "${selected?.quests?.title || 'your quest'}" on HerQuest and would like to discuss it.`,
      )}`
    : '';
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
            {loading && <p>Loading your applications...</p>}
            {!loading && loadError && (
                <div>
                  <p>{loadError}</p>
                  <Link className="primary-button small" href="/login">Log in</Link>
                </div>
            )}
            {!loading && !loadError && threads.length === 0 && (
                <p>No applications yet. Apply to a quest to start a conversation.</p>
            )}
            {threads.map((thread) => (
                <button
                  type="button"
                  key={thread.id}
                  className={`thread-item ${thread.id === selected?.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(thread.id)}
                >
                  <div className="avatar">{(thread.quests?.owner?.full_name || 'O').charAt(0)}</div>
                <div>
                    <strong>{thread.quests?.owner?.full_name || 'Quest owner'}</strong>
                    <p>{thread.quests?.title || 'HerQuest application'}</p>
                    <small>{thread.status}</small>
                </div>
                </button>
            ))}
          </aside>

          <div className="chat-panel">
            <div className="chat-header">
              <div>
                  <h2>{ownerName}</h2>
                  <span>Quest: {selected?.quests?.title || 'Select an application'}</span>
              </div>
                {whatsappUrl ? (
                  <a className="primary-button small" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    WhatsApp Owner
                  </a>
                ) : (
                  <button className="primary-button small" type="button" disabled>No phone listed</button>
                )}
            </div>

            <div className="chat-thread">
              {messageError && <p className="auth-message" role="status">{messageError}</p>}
              {selected && messages.length === 0 && (
                <div className="bubble you">
                  <span>You</span>
                  <p>I applied for this quest and would like to discuss the details.</p>
                  <small>Application status: {selected.status}</small>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.sender_id === currentUserId ? 'bubble you' : 'bubble'}
                >
                  <span>{message.sender_id === currentUserId ? 'You' : ownerName}</span>
                  <p>{message.content}</p>
                </div>
              ))}
              {!selected && <p>Select an application to contact the owner.</p>}
            </div>

            <form className="chat-input-row" onSubmit={sendMessage}>
              <input
                type="text"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Type your message to quest owner..."
                maxLength={5000}
                disabled={!selected || sending}
              />
              <button
                type="submit"
                className="primary-button small"
                disabled={!selected || sending || !messageText.trim()}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
