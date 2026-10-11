import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useChat } from '../../../context/ChatContext.jsx';
import { useEscape } from '../../../hooks/useEscape.js';
import { useIsPhone } from '../../../hooks/useMediaQuery.js';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll.js';
import { cx } from '../../../utils/cx.js';
import FramedImage from '../../ui/FramedImage/FramedImage.jsx';
import Icon from '../../ui/Icon/Icon.jsx';
import { LogoMark } from '../../ui/Logo/Logo.jsx';
import './ChatPanel.css';

export function ChatMessages({ messages, pending, error, onFollowUp, size = 'md' }) {
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, pending]);

  return (
    <ol className={cx('chat-messages', `chat-messages--${size}`)} aria-live="polite">
      {messages.map((m) => (
        <li key={m.id} className={cx('chat-message', `chat-message--${m.role}`)}>
          {m.role === 'assistant' && (
            <span className="chat-message__avatar" aria-hidden="true">
              <LogoMark />
            </span>
          )}
          <div className="chat-message__bubble">
            <span className="visually-hidden">{m.role === 'assistant' ? 'ArtMind says:' : 'You said:'}</span>
            <p className="chat-message__text">{m.text}</p>
            {m.paintings?.length > 0 && (
              <ul className="chat-message__paintings">
                {m.paintings.map((p) => (
                  <li key={p.slug}>
                    <Link to={`/paintings/${p.slug}`} className="chat-painting">
                      <FramedImage src={p.image} alt="" tones={p.tones} ratio="4 / 3" />
                      <span className="chat-painting__title">{p.title}</span>
                      <span className="chat-painting__artist">{p.artist?.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {m.followUps?.length > 0 && onFollowUp && (
              <div className="chat-message__followups">
                {m.followUps.map((f) => (
                  <button key={f} type="button" className="chat-followup" onClick={() => onFollowUp(f)} disabled={pending}>
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
      {pending && (
        <li className="chat-message chat-message--assistant">
          <span className="chat-message__avatar" aria-hidden="true">
            <LogoMark />
          </span>
          <div className="chat-message__bubble chat-message__bubble--typing">
            <span className="visually-hidden">ArtMind is writing</span>
            <span className="chat-dot" />
            <span className="chat-dot" />
            <span className="chat-dot" />
          </div>
        </li>
      )}
      {error && (
        <li className="chat-error" role="alert">
          {error}
        </li>
      )}
      <li ref={end} aria-hidden="true" className="chat-messages__end" />
    </ol>
  );
}

export function ChatInput({ onSend, pending, placeholder = 'Ask about a painting', autoFocus = false }) {
  const [text, setText] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!text.trim() || pending) return;
    onSend(text);
    setText('');
  };
  return (
    <form className="chat-input" onSubmit={submit}>
      <label htmlFor="chatText" className="visually-hidden">Your question</label>
      <input
        id="chatText"
        className="chat-input__field"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        maxLength={1000}
        autoComplete="off"
        autoFocus={autoFocus}
      />
      <button type="submit" className="chat-input__send" disabled={!text.trim() || pending} aria-label="Send">
        <Icon name="send" size={20} />
      </button>
    </form>
  );
}

export default function ChatPanel() {
  const { isOpen, close, messages, send, pending, error, context, clearContext } = useChat();
  const { pathname } = useLocation();
  const isPhone = useIsPhone();
  useEscape(close, isOpen);
  useLockBodyScroll(isOpen && isPhone);

  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (pathname.startsWith('/assistant')) closeRef.current();
  }, [pathname]);

  if (!isOpen) return null;

  return (
    <section className="chat-panel" role="dialog" aria-modal={isPhone ? 'true' : undefined} aria-labelledby="chatPanelTitle">
      <header className="chat-panel__head">
        <div>
          <h2 id="chatPanelTitle" className="chat-panel__title">Ask ArtMind</h2>
          <p className="chat-panel__note">Answers about paintings, artists, styles and techniques. Answers can be wrong.</p>
        </div>
        <button type="button" className="chat-panel__close" onClick={close} aria-label="Close chat">
          <Icon name="close" size={20} />
        </button>
      </header>
      {(context.paintingTitle || context.query) && (
        <div className="chat-panel__context">
          <span>
            {context.paintingTitle ? <>Asking about <strong>{context.paintingTitle}</strong></> : <>Search: <strong>{context.query}</strong></>}
          </span>
          <button type="button" onClick={clearContext} aria-label="Stop using this as context">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      <div className="chat-panel__body">
        <ChatMessages messages={messages} pending={pending} error={error} onFollowUp={send} size="sm" />
      </div>
      <footer className="chat-panel__foot">
        <ChatInput onSend={send} pending={pending} autoFocus={!isPhone} />
      </footer>
    </section>
  );
}
