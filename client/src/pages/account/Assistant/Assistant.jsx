import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { listConversations } from '../../../api/assistant.js';
import { ChatInput, ChatMessages } from '../../../components/layout/ChatPanel/ChatPanel.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Modal from '../../../components/ui/Modal/Modal.jsx';
import Skeleton from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useChat } from '../../../context/ChatContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { useIsDesktop } from '../../../hooks/useMediaQuery.js';
import { cx } from '../../../utils/cx.js';
import { timeAgo } from '../../../utils/format.js';
import './Assistant.css';

const SUGGESTIONS = [
  'Explain impressionism in simple words',
  'Show me calm paintings for a bedroom',
  'What is gold leaf?',
  'Find religious paintings on wood panel',
  'Oil or tempera, what is the difference?',
  'Which artist painted the most birds?',
];

function Sidebar({ onPick, onNew, onLoad, recent, user, activeId, location }) {
  return (
    <div className="page-assistant__side-inner">
      <Button block onClick={onNew}>New conversation</Button>
      <h2 className="label page-assistant__heading">Suggested</h2>
      <ul className="page-assistant__suggestions">
        {SUGGESTIONS.map((text) => (
          <li key={text}>
            <button type="button" className="page-assistant__suggestion" onClick={() => onPick(text)}>
              {text}
            </button>
          </li>
        ))}
      </ul>
      <h2 className="label page-assistant__heading">Recent</h2>
      {!user ? (
        <p className="page-assistant__guest">
          <Link to="/login" state={{ from: location }} className="text-link">Log in to keep your conversations</Link>
        </p>
      ) : recent.loading && !recent.data ? (
        <div className="page-assistant__recent-loading" role="status">
          <span className="visually-hidden">Loading your conversations</span>
          <Skeleton height={36} />
          <Skeleton height={36} />
        </div>
      ) : recent.error ? (
        <p className="page-assistant__empty">
          We could not load your conversations. <button type="button" className="text-link" onClick={recent.reload}>Try again</button>
        </p>
      ) : recent.data?.items.length ? (
        <ul className="page-assistant__recent">
          {recent.data.items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={cx('page-assistant__conversation', c.id === activeId && 'page-assistant__conversation--on')}
                aria-current={c.id === activeId ? 'true' : undefined}
                onClick={() => onLoad(c.id)}
              >
                <span className="page-assistant__conversation-title">{c.title}</span>
                <span className="page-assistant__conversation-time">{timeAgo(c.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="page-assistant__empty">No conversations yet.</p>
      )}
    </div>
  );
}

export default function Assistant() {
  useDocumentTitle('Assistant');
  const { user } = useAuth();
  const chat = useChat();
  const toast = useToast();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const input = useRef(null);
  const recent = useApi(() => listConversations(), [user?.id, chat.version], { enabled: Boolean(user) });
  const firstRender = useRef(true);

  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    input.current?.closest('form')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [chat.messages.length, chat.pending, chat.error]);

  const focusInput = () => setTimeout(() => input.current?.focus(), 0);

  const pick = (text) => {
    setDrawerOpen(false);
    chat.send(text);
    focusInput();
  };

  const startNew = () => {
    setDrawerOpen(false);
    chat.reset();
    focusInput();
  };

  const load = async (id) => {
    setDrawerOpen(false);
    try {
      await chat.loadConversation(id);
      focusInput();
    } catch (error) {
      toast.error(error.message || 'We could not open that conversation. Please try again.');
    }
  };

  const sidebar = (
    <Sidebar onPick={pick} onNew={startNew} onLoad={load} recent={recent} user={user} activeId={chat.conversationId} location={location} />
  );

  return (
    <div className="page-assistant">
      <aside className="page-assistant__side" aria-label="Conversations">
        {isDesktop && sidebar}
      </aside>

      <section className="page-assistant__main">
        <button type="button" className="page-assistant__drawer-button" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog">
          <span>Suggested</span>
          <Icon name="chevronRight" size={18} />
        </button>
        <h1>Ask ArtMind</h1>
        <p className="page-assistant__note">Answers about paintings, artists, styles and techniques. Answers can be wrong.</p>
        <div className="page-assistant__chat">
          <ChatMessages
            messages={chat.messages}
            pending={chat.pending}
            error={chat.error}
            onRetry={chat.retry}
            onFollowUp={chat.send}
            autoScroll={false}
            size="md"
          />
        </div>
        <div className="page-assistant__input">
          <ChatInput
            value={chat.draft}
            onChange={chat.setDraft}
            onSend={chat.send}
            pending={chat.pending}
            placeholder="Ask about a painting, an artist or a style"
            inputRef={input}
          />
        </div>
      </section>

      <Modal open={drawerOpen && !isDesktop} onClose={() => setDrawerOpen(false)} title="Suggested" className="page-assistant__drawer">
        {sidebar}
      </Modal>
    </div>
  );
}
