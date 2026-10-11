export const CATEGORIES = ['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'];

export const COLOUR_GROUPS = [
  { key: 'red', label: 'Red', hex: '#A33A2C' },
  { key: 'orange', label: 'Orange', hex: '#D9802E' },
  { key: 'yellow', label: 'Ochre', hex: '#C9A04A' },
  { key: 'green', label: 'Green', hex: '#7E8F4E' },
  { key: 'teal', label: 'Teal', hex: '#3A7C8C' },
  { key: 'blue', label: 'Blue', hex: '#1F3A66' },
  { key: 'violet', label: 'Violet', hex: '#6B5A86' },
  { key: 'pink', label: 'Pink', hex: '#C77E92' },
  { key: 'cream', label: 'Cream', hex: '#E8DCC6' },
  { key: 'grey', label: 'Grey', hex: '#8E8E8C' },
  { key: 'brown', label: 'Brown', hex: '#6B4E36' },
  { key: 'black', label: 'Black', hex: '#1F1D1B' },
];

export const CONTACT_SUBJECTS = ['General question', 'A painting', 'An artist', 'My account', 'Something is not working', 'Other'];

export const SITE_NAV = [
  { to: '/gallery', label: 'Gallery', match: ['/gallery', '/paintings', '/search'] },
  { to: '/collections', label: 'Collections', match: ['/collections'] },
  { to: '/artists', label: 'Artists', match: ['/artists'] },
  { to: '/identify', label: 'Identify a Style', match: ['/identify'] },
  { to: '/assistant', label: 'Assistant', match: ['/assistant'] },
  { to: '/about', label: 'About', match: ['/about'] },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/paintings', label: 'Paintings' },
  { to: '/admin/artists', label: 'Artists' },
  { to: '/admin/collections', label: 'Collections' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/messages', label: 'Messages' },
];

export const PROFILE_TABS = [
  { key: 'details', label: 'Details' },
  { key: 'interests', label: 'Interests' },
  { key: 'security', label: 'Security' },
  { key: 'account', label: 'Account' },
];

export const SUPPORT_EMAIL = 'support@artmind.app';
export const TAGLINE = 'An online painting gallery for everyone who loves art.';
