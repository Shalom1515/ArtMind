import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listUsers, setActive, setRole } from '../../../api/admin.js';
import { AdminHeader, AdminSearch } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import Avatar from '../../../components/ui/Avatar/Avatar.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import DataTable from '../../../components/ui/DataTable/DataTable.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Modal from '../../../components/ui/Modal/Modal.jsx';
import Pagination from '../../../components/ui/Pagination/Pagination.jsx';
import Skeleton from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { cx } from '../../../utils/cx.js';
import { formatDate, timeAgo } from '../../../utils/format.js';
import './Users.css';

const PER_PAGE = 12;

function Verified({ verified }) {
  return verified ? (
    <span className="page-admin-users__tick" title="Verified">
      <Icon name="check" size={12} strokeWidth={2.4} />
      <span className="visually-hidden">Verified</span>
    </span>
  ) : (
    <span className="page-admin-users__dash" title="Not verified">
      <span className="page-admin-users__dash-line" aria-hidden="true" />
      <span className="visually-hidden">Not verified</span>
    </span>
  );
}

function RoleBadge({ role }) {
  return <span className={cx('page-admin-users__role', role === 'admin' && 'page-admin-users__role--admin')}>{role === 'admin' ? 'Admin' : 'User'}</span>;
}

export default function Users() {
  useDocumentTitle('Admin users');
  const { user: me } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const page = Math.max(Number(params.get('page')) || 1, 1);
  const list = useApi(() => listUsers({ q: q || undefined, page, limit: PER_PAGE }), [q, page]);
  const [busy, setBusy] = useState(null);
  const [toDeactivate, setToDeactivate] = useState(null);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value || (key === 'page' && Number(value) === 1)) next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: !('page' in changes) });
  };

  const replaceRow = (row) => list.setData((data) => ({ ...data, items: data.items.map((u) => (u.id === row.id ? row : u)) }));

  const changeRole = async (u) => {
    const role = u.role === 'admin' ? 'user' : 'admin';
    setBusy(u.id);
    try {
      const { user } = await setRole(u.id, role);
      replaceRow(user);
      toast.success(role === 'admin' ? `${u.name} is now an admin.` : `${u.name} is no longer an admin.`);
    } catch (error) {
      toast.error(error.message || 'We could not change that role. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const changeActive = async (u, active) => {
    setBusy(u.id);
    try {
      const { user } = await setActive(u.id, active);
      replaceRow(user);
      toast.success(active ? `${u.name} can log in again.` : `${u.name} is deactivated.`);
      setToDeactivate(null);
    } catch (error) {
      toast.error(error.message || 'We could not update that account. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const actions = (u) =>
    u.id === me?.id ? (
      <span className="page-admin-users__you">This is you</span>
    ) : (
      <span className="page-admin-users__links">
        <button type="button" className="page-admin-users__link" onClick={() => changeRole(u)} disabled={busy === u.id}>
          {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
          <span className="visually-hidden">: {u.name}</span>
        </button>
        {u.active ? (
          <button type="button" className="page-admin-users__link" onClick={() => setToDeactivate(u)} disabled={busy === u.id}>
            Deactivate<span className="visually-hidden">: {u.name}</span>
          </button>
        ) : (
          <button type="button" className="page-admin-users__link" onClick={() => changeActive(u, true)} disabled={busy === u.id}>
            Reactivate<span className="visually-hidden">: {u.name}</span>
          </button>
        )}
      </span>
    );

  const who = (u) => (
    <span className="page-admin-users__who">
      <Avatar src={u.avatar} name={u.name} size={44} />
      <span>
        <span className="page-admin-users__name">{u.name}</span>
        {!u.active && <span className="page-admin-users__off">Deactivated</span>}
      </span>
    </span>
  );

  const columns = [
    { key: 'name', header: 'Name', render: who },
    { key: 'email', header: 'Email', render: (u) => <span className="page-admin-users__email">{u.email}</span> },
    { key: 'verified', header: 'Verified', align: 'center', render: (u) => <Verified verified={u.verified} /> },
    { key: 'role', header: 'Role', render: (u) => <RoleBadge role={u.role} /> },
    { key: 'joinedAt', header: 'Joined', render: (u) => <span className="nowrap">{formatDate(u.joinedAt)}</span> },
    { key: 'lastActiveAt', header: 'Last active', render: (u) => <span className="nowrap">{timeAgo(u.lastActiveAt)}</span> },
    { key: 'actions', header: 'Actions', render: actions },
  ];

  const items = list.data?.items || [];
  const empty = q ? 'No users match your search.' : 'No users yet.';

  return (
    <div className="page-admin-users">
      <AdminHeader title="Users">
        <AdminSearch value={q} onChange={(value) => update({ q: value, page: 1 })} placeholder="Search by name or email" />
      </AdminHeader>

      {list.error ? (
        <div className="admin-state admin-page-card" role="alert">
          <p>We could not load the users.</p>
          <Button variant="secondary" size="sm" onClick={list.reload}>Try again</Button>
        </div>
      ) : (
        <>
          <p className="visually-hidden" role="status">{list.loading ? 'Loading users' : `${list.data?.total ?? 0} users`}</p>
          <div className="page-admin-users__table">
            <DataTable columns={columns} rows={items} loading={list.loading} empty={empty} caption="Users" />
          </div>
          <ul className="page-admin-users__cards" aria-label="Users">
            {list.loading && Array.from({ length: 3 }, (_, i) => <li key={i} className="page-admin-users__card"><Skeleton variant="text" lines={3} /></li>)}
            {!list.loading && !items.length && <li className="admin-state admin-page-card">{empty}</li>}
            {!list.loading &&
              items.map((u) => (
                <li key={u.id} className="page-admin-users__card">
                  <div className="page-admin-users__card-top">
                    {who(u)}
                    <RoleBadge role={u.role} />
                  </div>
                  <p className="page-admin-users__email">{u.email}</p>
                  <dl className="page-admin-users__facts">
                    <div><dt>Verified</dt><dd><Verified verified={u.verified} /></dd></div>
                    <div><dt>Joined</dt><dd>{formatDate(u.joinedAt)}</dd></div>
                    <div><dt>Last active</dt><dd>{timeAgo(u.lastActiveAt)}</dd></div>
                  </dl>
                  {actions(u)}
                </li>
              ))}
          </ul>
          <Pagination page={list.data?.page || page} pages={list.data?.pages || 1} onChange={(n) => update({ page: n })} variant="boxed" />
        </>
      )}

      <Modal
        open={Boolean(toDeactivate)}
        onClose={() => busy === null && setToDeactivate(null)}
        title={toDeactivate ? `Deactivate ${toDeactivate.name}?` : ''}
        size="sm"
        footer={
          <>
            <Button variant="danger" block loading={busy === toDeactivate?.id} onClick={() => changeActive(toDeactivate, false)}>Deactivate</Button>
            <Button variant="secondary" block onClick={() => setToDeactivate(null)} disabled={busy !== null}>Cancel</Button>
          </>
        }
      >
        <p>They will be signed out and cannot log in until you reactivate the account.</p>
      </Modal>
    </div>
  );
}
