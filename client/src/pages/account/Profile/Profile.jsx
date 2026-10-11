import { Navigate, useParams } from 'react-router-dom';
import Avatar from '../../../components/ui/Avatar/Avatar.jsx';
import Tabs from '../../../components/ui/Tabs/Tabs.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { PROFILE_TABS } from '../../../utils/constants.js';
import { formatMonthYear } from '../../../utils/format.js';
import AccountTab from './AccountTab.jsx';
import DetailsTab from './DetailsTab.jsx';
import InterestsTab from './InterestsTab.jsx';
import SecurityTab from './SecurityTab.jsx';
import './Profile.css';

const PANELS = { details: DetailsTab, interests: InterestsTab, security: SecurityTab, account: AccountTab };

export default function Profile() {
  const { tab = 'details' } = useParams();
  const { user } = useAuth();
  const current = PROFILE_TABS.find((t) => t.key === tab);
  useDocumentTitle(current ? `Profile ${current.label.toLowerCase()}` : 'Profile');
  if (!current) return <Navigate to="/profile" replace />;
  const Panel = PANELS[current.key];
  const tabs = PROFILE_TABS.map((t) => ({ ...t, to: t.key === 'details' ? '/profile' : `/profile/${t.key}` }));

  return (
    <div className="page-profile container">
      <p className="label eyebrow">Profile</p>
      <h1>Profile</h1>

      <section className="page-profile__who" aria-label="Your account summary">
        <Avatar src={user.avatar} name={user.name} size={112} className="page-profile__avatar" />
        <div className="page-profile__id">
          <h2 className="page-profile__name">{user.name}</h2>
          <p className="page-profile__email">
            <span>{user.email}</span>
            {user.verified && <span className="badge">Verified</span>}
          </p>
          <p className="page-profile__since">Member since {formatMonthYear(user.joinedAt)}</p>
        </div>
      </section>

      <Tabs tabs={tabs} active={current.key} label="Profile sections" className="page-profile__bar" />

      <div className="page-profile__layout">
        <aside className="page-profile__side card">
          <Tabs tabs={tabs} active={current.key} variant="side" label="Profile sections" />
        </aside>
        <section className="page-profile__panel card" aria-labelledby="profilePanelTitle">
          <Panel />
        </section>
      </div>
    </div>
  );
}
