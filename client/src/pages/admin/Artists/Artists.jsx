import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Artists.css';

export default function Artists() {
  useDocumentTitle('Admin artists');
  return (
    <div className="page-admin-artists">
      <AdminHeader title="Artists" />
    </div>
  );
}
