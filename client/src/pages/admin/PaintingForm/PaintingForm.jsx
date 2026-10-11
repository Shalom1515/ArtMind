import { useParams } from 'react-router-dom';
import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './PaintingForm.css';

export default function PaintingForm() {
  const { id } = useParams();
  const title = id ? 'Edit painting' : 'Add painting';
  useDocumentTitle(title);
  return (
    <div className="page-admin-paintingform">
      <AdminHeader title={title} />
    </div>
  );
}
