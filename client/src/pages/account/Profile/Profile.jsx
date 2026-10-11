import { Navigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { PROFILE_TABS } from '../../../utils/constants.js';
import AccountTab from './AccountTab.jsx';
import DetailsTab from './DetailsTab.jsx';
import InterestsTab from './InterestsTab.jsx';
import SecurityTab from './SecurityTab.jsx';
import './Profile.css';

const PANELS = { details: DetailsTab, interests: InterestsTab, security: SecurityTab, account: AccountTab };

export default function Profile() {
  const { tab = 'details' } = useParams();
  const current = PROFILE_TABS.find((t) => t.key === tab);
  useDocumentTitle(current ? `Profile, ${current.label}` : 'Profile');
  if (!current) return <Navigate to="/profile" replace />;
  const Panel = PANELS[current.key];

  return (
    <div className="page-profile container page-head">
      <h1>Profile</h1>
      <Panel />
    </div>
  );
}
