import { useAuth } from '../../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { firstName, greeting } from '../../../utils/format.js';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  useDocumentTitle('Dashboard');
  return (
    <div className="page-dashboard container page-head">
      <h1>
        {greeting()}, {firstName(user?.name)}
      </h1>
    </div>
  );
}
