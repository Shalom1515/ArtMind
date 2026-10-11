import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listMessages, setMessageStatus } from '../../../api/admin.js';
import { AdminHeader, useAdminCounts } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import Avatar from '../../../components/ui/Avatar/Avatar.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Skeleton from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { useMediaQuery } from '../../../hooks/useMediaQuery.js';
import { cx } from '../../../utils/cx.js';
import { formatDate } from '../../../utils/format.js';
import './Messages.css';

const FILTERS = [
  { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' },
  { key: 'replied', label: 'Replied' },
];

function Detail({ message, onStatus, busy, onBack }) {
  const heading = useRef(null);

  const standalone = Boolean(onBack);
  useEffect(() => {
    if (standalone) heading.current?.focus();
  }, [message.id, standalone]);

  const mail = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
  return (
    <article className="page-admin-messages__detail admin-page-card" aria-labelledby="messageSubject">
      {onBack && (
        <button type="button" className="page-admin-messages__back" onClick={onBack}>
          <Icon name="arrowLeft" size={16} /> Back to messages
        </button>
      )}
      <header className="page-admin-messages__from">
        <Avatar name={message.name} size={72} />
        <div className="page-admin-messages__from-text">
          <p className="page-admin-messages__from-name">{message.name}</p>
          <a href={`mailto:${message.email}`} className="page-admin-messages__from-email">{message.email}</a>
          <p className="page-admin-messages__from-date">{formatDate(message.createdAt)}</p>
        </div>
      </header>
      <h2 id="messageSubject" ref={heading} tabIndex={-1} className="page-admin-messages__subject">{message.subject}</h2>
      <div className="page-admin-messages__body">
        {message.message.split(/\n+/).map((line, i) => <p key={i}>{line}</p>)}
      </div>
      <div className="page-admin-messages__buttons">
        <Button block onClick={() => onStatus('replied')} disabled={message.status === 'replied'} loading={busy === 'replied'}>Mark as replied</Button>
        <Button block variant="secondary" onClick={() => onStatus('read')} disabled={message.status === 'read'} loading={busy === 'read'}>Mark as read</Button>
        <a href={mail} className="text-link page-admin-messages__reply">Reply by email</a>
      </div>
    </article>
  );
}

export default function Messages() {
  useDocumentTitle('Admin messages');
  const toast = useToast();
  const { refreshCounts } = useAdminCounts();
  const wide = useMediaQuery('(min-width: 900px)');
  const [params, setParams] = useSearchParams();
  const status = FILTERS.some((f) => f.key === params.get('status')) ? params.get('status') : 'new';
  const selectedId = params.get('id');
  const list = useApi(() => listMessages(status), [status]);
  const [busy, setBusy] = useState(null);

  const items = list.data?.items || [];
  const counts = list.data?.counts || {};
  const selected = items.find((m) => m.id === selectedId) || (wide ? items[0] : null);

  const go = (changes, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace });
  };

  const changeStatus = async (next) => {
    if (!selected) return;
    setBusy(next);
    try {
      await setMessageStatus(selected.id, next);
      const label = FILTERS.find((f) => f.key === next).label;
      toast.success(`Moved to ${label}.`, { action: { label: 'Show', onClick: () => go({ status: next, id: selected.id }) } });
      const index = items.findIndex((m) => m.id === selected.id);
      const following = items.filter((m) => m.id !== selected.id)[index] || items.filter((m) => m.id !== selected.id)[index - 1];
      go({ id: wide && following ? following.id : '' }, true);
      list.reload();
      refreshCounts?.();
    } catch (error) {
      toast.error(error.message || 'We could not update that message. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const showDetailOnly = !wide && selected;

  return (
    <div className="page-admin-messages">
      <AdminHeader title="Messages">
        <div className="page-admin-messages__filters" role="group" aria-label="Show messages">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={cx('page-admin-messages__filter', status === f.key && 'page-admin-messages__filter--on')}
              aria-pressed={status === f.key}
              onClick={() => go({ status: f.key === 'new' ? '' : f.key, id: '' })}
            >
              {f.label}
              {list.data && <span className="page-admin-messages__count">{counts[f.key] ?? 0}</span>}
            </button>
          ))}
        </div>
      </AdminHeader>

      {list.error ? (
        <div className="admin-state admin-page-card" role="alert">
          <p>We could not load the messages.</p>
          <Button variant="secondary" size="sm" onClick={list.reload}>Try again</Button>
        </div>
      ) : showDetailOnly ? (
        <Detail message={selected} onStatus={changeStatus} busy={busy} onBack={() => go({ id: '' })} />
      ) : (
        <div className="page-admin-messages__layout">
          <section className="page-admin-messages__list-wrap" aria-label={`${FILTERS.find((f) => f.key === status).label} messages`}>
            {list.loading && !list.data ? (
              <div className="admin-page-card page-admin-messages__loading" role="status">
                <span className="visually-hidden">Loading messages</span>
                <Skeleton variant="text" lines={3} />
                <Skeleton variant="text" lines={3} />
              </div>
            ) : items.length === 0 ? (
              <p className="admin-state admin-page-card">No {status} messages.</p>
            ) : (
              <ul className="page-admin-messages__list admin-page-card">
                {items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={cx('page-admin-messages__item', selected?.id === m.id && 'page-admin-messages__item--on')}
                      aria-current={selected?.id === m.id ? 'true' : undefined}
                      onClick={() => go({ id: m.id })}
                    >
                      <span className="page-admin-messages__item-top">
                        <span className="page-admin-messages__item-name">{m.name}</span>
                        <span className="page-admin-messages__item-date">{formatDate(m.createdAt)}</span>
                      </span>
                      <span className="page-admin-messages__item-subject">{m.subject}</span>
                      <span className="page-admin-messages__item-preview">{m.message}</span>
                      {!wide && <Icon name="chevronRight" size={18} className="page-admin-messages__item-arrow" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {wide && selected && <Detail message={selected} onStatus={changeStatus} busy={busy} />}
        </div>
      )}
    </div>
  );
}
