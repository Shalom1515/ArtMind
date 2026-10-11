import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteAccount, downloadMyData } from '../../../api/me.js';
import Button from '../../../components/ui/Button/Button.jsx';
import Modal from '../../../components/ui/Modal/Modal.jsx';
import PasswordInput from '../../../components/ui/PasswordInput/PasswordInput.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { FormError, GENERAL_ERROR, TextField } from '../../auth/form.jsx';

export default function AccountTab() {
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const deleted = useRef(false);
  const signOutRef = useRef(null);
  signOutRef.current = () => {
    setUser(null);
    toast.success('Your account has been deleted.');
  };

  useEffect(() => () => {
    if (deleted.current) signOutRef.current();
  }, []);

  const onDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadMyData();
      toast.success('Your data is downloading.');
    } catch (error) {
      setDownloadError(error.message || GENERAL_ERROR);
    } finally {
      setDownloading(false);
    }
  };

  const closeModal = () => {
    if (deleting) return;
    setOpen(false);
    setPassword('');
    setConfirmText('');
    setPasswordError('');
    setDeleteError('');
  };

  const ready = confirmText === 'DELETE' && password.length > 0;

  const onDelete = async (event) => {
    event.preventDefault();
    if (!ready || deleting) return;
    setDeleting(true);
    setPasswordError('');
    setDeleteError('');
    try {
      await deleteAccount(password);
      deleted.current = true;
      navigate('/', { replace: true });
    } catch (error) {
      if (error.fields?.password) setPasswordError('That password is not right.');
      else setDeleteError(error.message || GENERAL_ERROR);
      setDeleting(false);
    }
  };

  return (
    <>
      <h2 id="profilePanelTitle" className="page-profile__title">Your account</h2>

      <section className="page-profile__block" aria-labelledby="downloadTitle">
        <h3 id="downloadTitle">Download my data</h3>
        <p className="page-profile__intro">Save a copy of your profile, favourites, views and conversations as a JSON file.</p>
        <FormError message={downloadError} className="mt-4" />
        <Button variant="secondary" loading={downloading} onClick={onDownload} icon="download" className="mt-4">
          Download my data
        </Button>
      </section>

      <hr className="page-profile__rule" />

      <section className="page-profile__block" aria-labelledby="deleteTitle">
        <h3 id="deleteTitle">Delete account</h3>
        <p className="page-profile__intro">This removes your account, favourites and conversations for good. It cannot be undone.</p>
        <Button variant="danger" onClick={() => setOpen(true)} className="mt-4">Delete account</Button>
      </section>

      <Modal open={open} onClose={closeModal} title="Delete your account?" size="sm">
        <form className="page-profile__delete" onSubmit={onDelete} noValidate>
          <p>Everything linked to your account will be deleted. This cannot be undone.</p>
          <FormError message={deleteError} />
          <PasswordInput
            label="Your password"
            placeholder=""
            value={password}
            onChange={(value) => setPassword(value)}
            error={passwordError}
            autoComplete="current-password"
          />
          <TextField
            label="Type DELETE to confirm"
            value={confirmText}
            onChange={setConfirmText}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <div className="page-profile__delete-buttons">
            <Button type="submit" variant="danger" block disabled={!ready} loading={deleting}>Delete my account</Button>
            <Button variant="secondary" block onClick={closeModal}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
