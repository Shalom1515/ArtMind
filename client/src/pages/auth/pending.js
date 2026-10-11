const KEY = 'artmind_pending_email';
let draft = null;

export function setPendingEmail(email) {
  try {
    sessionStorage.setItem(KEY, String(email || '').trim().toLowerCase());
  } catch {
  }
}

export function getPendingEmail() {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function clearPending() {
  draft = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
  }
}

export const saveDraft = (values) => {
  draft = { ...values };
};

export const readDraft = () => draft;
