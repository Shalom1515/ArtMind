import { useState } from 'react';
import { changePassword, signOutOtherDevices } from '../../../api/me.js';
import Button from '../../../components/ui/Button/Button.jsx';
import PasswordInput from '../../../components/ui/PasswordInput/PasswordInput.jsx';
import StrengthMeter from '../../../components/ui/StrengthMeter/StrengthMeter.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { FormError, GENERAL_ERROR, newPasswordProblem, PASSWORD_RULE, useForm } from '../../auth/form.jsx';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

function validate(v) {
  return {
    currentPassword: v.currentPassword ? '' : 'Enter your current password.',
    newPassword: newPasswordProblem(v.newPassword),
    confirm: !v.confirm ? 'Enter your new password again.' : v.confirm !== v.newPassword ? 'The passwords do not match.' : '',
  };
}

export default function SecurityTab() {
  const toast = useToast();
  const form = useForm(EMPTY, validate);
  const [signingOut, setSigningOut] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const onSubmit = form.submit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword({ currentPassword, newPassword });
    } catch (error) {
      if (error.fields?.currentPassword) {
        form.setErrors({ currentPassword: 'Your current password is not right.' });
        form.focusFirstError();
        return;
      }
      if (error.fields?.newPassword) {
        form.setErrors({ newPassword: PASSWORD_RULE });
        form.focusFirstError();
        return;
      }
      throw error;
    }
    form.replaceValues(EMPTY);
    toast.success('Your password has been changed.');
  });

  const onSignOut = async () => {
    setSigningOut(true);
    setSessionError('');
    try {
      await signOutOtherDevices();
      toast.success('You are now signed out on your other devices.');
    } catch (error) {
      setSessionError(error.message || GENERAL_ERROR);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <h2 id="profilePanelTitle" className="page-profile__title">Change password</h2>
      <p className="page-profile__intro">{PASSWORD_RULE}</p>
      <form ref={form.formRef} className="page-profile__form page-profile__form--tight" onSubmit={onSubmit} noValidate>
        <FormError message={form.formError} />
        <PasswordInput label="Current password" placeholder="" toggle={false} autoComplete="current-password" {...form.field('currentPassword')} />
        <PasswordInput label="New password" placeholder="" autoComplete="new-password" {...form.field('newPassword')}>
          <StrengthMeter password={form.values.newPassword} />
        </PasswordInput>
        <PasswordInput label="Confirm new password" placeholder="" toggle={false} autoComplete="new-password" {...form.field('confirm')} />
        <Button type="submit" block loading={form.sending}>Change password</Button>
      </form>

      <hr className="page-profile__rule" />

      <h2 className="page-profile__title">Sessions</h2>
      <p className="page-profile__intro">Sign out on every other device where you are logged in.</p>
      <FormError message={sessionError} className="mt-4" />
      <Button variant="secondary" block loading={signingOut} onClick={onSignOut} className="mt-4">
        Sign out of other devices
      </Button>
    </>
  );
}
