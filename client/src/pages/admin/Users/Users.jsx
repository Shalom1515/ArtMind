import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Users.css';

export default function Users() {
  useDocumentTitle('Admin users');
  return (
    <div className="page-admin-users">
      <AdminHeader title="Users" />
    </div>
  );
}
