import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Overview.css';

export default function Overview() {
  useDocumentTitle('Admin overview');
  return (
    <div className="page-admin-overview">
      <AdminHeader title="Overview" />
    </div>
  );
}
