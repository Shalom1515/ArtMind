import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ChatAvatar() {
  const [failed, setFailed] = useState(false);
  return (
    <span className="chat-message__avatar" aria-hidden="true">
      {failed ? <LogoMark /> : <img src="/brand/logo_mark.png" alt="" onError={() => setFailed(true)} />}
    </span>
  );
}

export function ChatMessages({ messages, pending, error, onRetry, onFollowUp, onPaintingClick, autoScroll = true, size = 'md' }) {
  const end = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (autoScroll) end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages.length, pending, error, autoScroll]);

  return (
    <ol className={cx('chat-messages', `chat-messages--${size}`)} aria-live="polite" aria-label="Conversation">
      {messages.map((m) => (
        <li key={m.id} className={cx('chat-message', `chat-message--${m.role}`)}>
          {m.role === 'assistant' && <ChatAvatar />}
          <div className="chat-message__bubble">
            <span className="visually-hidden">{m.role === 'assistant' ? 'ArtMind says:' : 'You said:'}</span>
            <p className="chat-message__text">{m.text}</p>
            {m.paintings?.length > 0 && (
              <ul className="chat-message__paintings" aria-label="Paintings">
                {m.paintings.slice(0, 3).map((p) => (
                  <li key={p.slug}>
                    <Link to={`/paintings/${p.slug}`} className="chat-painting" onClick={() => onPaintingClick?.(p)}>
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
                {m.followUps.slice(0, 3).map((f) => (
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
          <ChatAvatar />
          <div className="chat-message__bubble chat-message__bubble--typing" role="status">
            <span className="visually-hidden">ArtMind is writing</span>
            <span className="chat-dot" />
            <span className="chat-dot" />
            <span className="chat-dot" />
          </div>
        </li>
      )}
      {error && !pending && (
        <li className="chat-error" role="alert">
          <span>{error}</span>
          {onRetry && (
            <button type="button" className="chat-error__retry" onClick={onRetry}>
              Retry
            </button>
          )}
        </li>
      )}
      <li ref={end} aria-hidden="true" className="chat-messages__end" />
    </ol>
  );
}

export function ChatInput({ value, onChange, onSend, pending, placeholder = 'Ask about a painting', inputRef }) {
  const id = useId();
  const ownRef = useRef(null);
  const field = inputRef || ownRef;

  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value, field]);

  const submit = (event) => {
    event?.preventDefault();
    if (!value.trim() || pending) return;
    onSend(value);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className="chat-input" onSubmit={submit}>
      <label htmlFor={id} className="visually-hidden">Your question</label>
      <textarea
        id={id}
        ref={field}
        rows={1}
        className="chat-input__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={1000}
        autoComplete="off"
        enterKeyHint="send"
      />
      <button type="submit" className="chat-input__send" disabled={!value.trim() || pending} aria-label="Send">
        <Icon name="send" size={20} />
      </button>
    </form>
  );
}

export default function ChatPanel() {
  const { isOpen, close, messages, send, retry, pending, error, context, clearContext, draft, setDraft } = useChat();
  const { pathname } = useLocation();
  const isPhone = useIsPhone();
  const panel = useRef(null);
  const body = useRef(null);
  const input = useRef(null);
  useEscape(close, isOpen);
  useLockBodyScroll(isOpen && isPhone);

  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (pathname.startsWith('/assistant')) closeRef.current({ restoreFocus: false });
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
    const el = input.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trapFocus = (event) => {
    if (event.key !== 'Tab') return;
    const items = [...panel.current.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem.focus();
    }
  };

  return (
    <section ref={panel} className="chat-panel" role="dialog" aria-modal="true" aria-labelledby="chatPanelTitle" onKeyDown={trapFocus}>
      <header className="chat-panel__head">
        <div className="chat-panel__heading">
          <h2 id="chatPanelTitle" className="chat-panel__title">Ask ArtMind</h2>
          <p className="chat-panel__note">Answers about paintings, artists, styles and techniques. Answers can be wrong.</p>
        </div>
        <Link to="/assistant" className="chat-panel__full">Open full page</Link>
        <button type="button" className="chat-panel__close" onClick={() => close()} aria-label="Close chat">
          <Icon name="close" size={20} />
        </button>
      </header>
      {context.paintingTitle && (
        <div className="chat-panel__context">
          <span>About: <strong>{context.paintingTitle}</strong></span>
          <button type="button" onClick={clearContext} aria-label={`Stop asking about ${context.paintingTitle}`}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      <div className="chat-panel__body" ref={body}>
        <ChatMessages
          messages={messages}
          pending={pending}
          error={error}
          onRetry={retry}
          onFollowUp={send}
          onPaintingClick={() => isPhone && close({ restoreFocus: false })}
          size="sm"
        />
      </div>
      <footer className="chat-panel__foot">
        <ChatInput value={draft} onChange={setDraft} onSend={send} pending={pending} inputRef={input} />
      </footer>
    </section>
  );
}
