import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Messages.css';

export default function Messages() {
  useDocumentTitle('Admin messages');
  return (
    <div className="page-admin-messages">
      <AdminHeader title="Messages" />
    </div>
  );
}
