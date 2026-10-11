import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Paintings.css';

export default function Paintings() {
  useDocumentTitle('Admin paintings');
  return (
    <div className="page-admin-paintings">
      <AdminHeader title="Paintings" />
    </div>
  );
}
