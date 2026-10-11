import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Collections.css';

export default function Collections() {
  useDocumentTitle('Admin collections');
  return (
    <div className="page-admin-collections">
      <AdminHeader title="Collections" />
    </div>
  );
}
