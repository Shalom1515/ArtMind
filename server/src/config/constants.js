export const CATEGORIES = ['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'];

export const STYLES = [
  'Abstract expressionism',
  'Baroque revival',
  'Colour field',
  'Contemporary',
  'Expressionism',
  'Folk',
  'Geometric abstraction',
  'Impressionism',
  'Ink wash',
  'Realism',
  'Renaissance revival',
  'Still life',
];

export const MEDIUMS = ['Acrylic', 'Charcoal', 'Gouache', 'Ink', 'Mixed media', 'Oil', 'Pastel', 'Tempera', 'Watercolour'];

export const SURFACES = ['Board', 'Canvas', 'Linen', 'Paper', 'Wood panel'];

export const MOODS = ['Calm', 'Dramatic', 'Energetic', 'Joyful', 'Melancholic', 'Solemn', 'Tender'];

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

export const MESSAGE_STATUSES = ['new', 'read', 'replied'];

export const ROLES = ['user', 'admin'];

export const COOKIE_NAME = 'artmind_token';

export const GUEST_COOKIE = 'artmind_guest';

export const CATEGORY_IMAGES = Object.fromEntries(CATEGORIES.map((name) => [name, `/images/categories/${name.toLowerCase()}.jpg`]));

export const SEARCH_SUGGESTIONS = ['calm landscapes', 'abstract with warm colours', 'religious paintings on wood panel'];

export const ASSISTANT_SUGGESTIONS = [
  'Explain impressionism in simple words',
  'Show me calm paintings for a bedroom',
  'What is gold leaf?',
  'Find religious paintings on wood panel',
  'Oil or tempera, what is the difference?',
  'Which artist painted the most birds?',
];
