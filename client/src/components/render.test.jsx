import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider, MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import paintings from '../../../server/data/seed/paintings.json';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ChatProvider } from '../context/ChatContext.jsx';
import { FavouritesProvider } from '../context/FavouritesContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import AdminLayout from './layout/AdminLayout/AdminLayout.jsx';
import AuthLayout from './layout/AuthLayout/AuthLayout.jsx';
import SiteLayout from './layout/SiteLayout/SiteLayout.jsx';
import Accordion from './ui/Accordion/Accordion.jsx';
import ArtistCard from './ui/ArtistCard/ArtistCard.jsx';
import BarList from './ui/BarList/BarList.jsx';
import Breadcrumb from './ui/Breadcrumb/Breadcrumb.jsx';
import Button from './ui/Button/Button.jsx';
import Carousel from './ui/Carousel/Carousel.jsx';
import Checkbox from './ui/Checkbox/Checkbox.jsx';
import Chip from './ui/Chip/Chip.jsx';
import CodeInput from './ui/CodeInput/CodeInput.jsx';
import CollectionCard from './ui/CollectionCard/CollectionCard.jsx';
import DataTable from './ui/DataTable/DataTable.jsx';
import DonutChart from './ui/DonutChart/DonutChart.jsx';
import EmptyState from './ui/EmptyState/EmptyState.jsx';
import FilterChip from './ui/FilterChip/FilterChip.jsx';
import FramedImage from './ui/FramedImage/FramedImage.jsx';
import LineChart from './ui/LineChart/LineChart.jsx';
import Modal from './ui/Modal/Modal.jsx';
import Pagination from './ui/Pagination/Pagination.jsx';
import PaintingCard from './ui/PaintingCard/PaintingCard.jsx';
import PasswordInput from './ui/PasswordInput/PasswordInput.jsx';
import Select from './ui/Select/Select.jsx';
import Skeleton from './ui/Skeleton/Skeleton.jsx';
import StatTile from './ui/StatTile/StatTile.jsx';
import StrengthMeter from './ui/StrengthMeter/StrengthMeter.jsx';
import Swatch from './ui/Swatch/Swatch.jsx';
import Tabs from './ui/Tabs/Tabs.jsx';
import TagInput from './ui/TagInput/TagInput.jsx';
import Toggle from './ui/Toggle/Toggle.jsx';
import ToastStack from './ui/Toast/Toast.jsx';

const card = { ...paintings[10], artist: { slug: 'adaeze-nwosu', name: 'Adaeze Nwosu' } };

function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <FavouritesProvider>
          <ChatProvider>{children}</ChatProvider>
        </FavouritesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

function withRouter(layout, path) {
  const router = createMemoryRouter(
    [{ element: <Providers>{layout}</Providers>, children: [{ path, element: <h1>Page heading</h1> }] }],
    { initialEntries: [path] },
  );
  return renderToString(<RouterProvider router={router} />);
}

describe('layouts render', () => {
  test('site layout has the header, footer and launcher', () => {
    const html = withRouter(<SiteLayout />, '/gallery');
    expect(html).toContain('Page heading');
    expect(html).toContain('Search the way you speak');
    expect(html).toContain('An online painting gallery for everyone who loves art.');
    expect(html).toContain('Ask ArtMind');
  });

  test('auth layout shows the painting caption for the page', () => {
    expect(withRouter(<AuthLayout />, '/login')).toContain('Dancer Resting, Clara Benedetti, 2019');
  });

  test('admin layout has the sidebar links', () => {
    const html = withRouter(<AdminLayout />, '/admin');
    for (const label of ['Overview', 'Paintings', 'Artists', 'Collections', 'Users', 'Messages', 'Back to site']) {
      expect(html).toContain(label);
    }
  });
});

describe('ui components render', () => {
  test('every component renders with sample props', () => {
    const html = renderToString(
      <MemoryRouter>
        <Providers>
          <Button>Explore the gallery</Button>
          <Button variant="secondary" to="/identify">Identify a style</Button>
          <Chip variant="solid" onRemove={() => {}}>Category: Landscape</Chip>
          <FilterChip selected>Landscape</FilterChip>
          <PaintingCard painting={card} />
          <ArtistCard artist={{ slug: 'x', name: 'Samuel Adeyemi', country: 'Nigeria', bornYear: 1984, styles: ['Realism'], works: 5 }} />
          <ArtistCard variant="compact" artist={{ slug: 'x', name: 'Ngozi Eze' }} />
          <CollectionCard collection={{ slug: 'quiet_landscapes', title: 'Quiet landscapes', shortLine: 'Mist', count: 8, covers: [card] }} />
          <FramedImage src="/x.jpg" alt="x" tones={card.tones} frame="gallery" caption="Caption" />
          <Pagination page={1} pages={3} onChange={() => {}} />
          <Select label="Sort" options={['Newest', 'Oldest']} value="Newest" prefix="Sort:" />
          <Checkbox label="Oil" count={12} checked />
          <Toggle label="Featured" checked />
          <Swatch colour="#5C7A6B" showHex />
          <Tabs tabs={[{ key: 'a', label: 'Details' }, { key: 'b', label: 'Security' }]} active="a" />
          <Modal open={false} title="Edit artist" />
          <Accordion items={[{ question: 'What is ArtMind?', answer: 'A gallery.' }]} />
          <Breadcrumb items={[{ label: 'Gallery', to: '/gallery' }, { label: 'Landscape' }]} />
          <Carousel><span>One</span><span>Two</span></Carousel>
          <EmptyState title="No favourites yet" />
          <Skeleton variant="card" />
          <PasswordInput value="Paint1234" />
          <StrengthMeter password="Paint1234" />
          <CodeInput value="482" />
          <TagInput value={['river', 'dawn']} />
          <StatTile value={2140} label="Views" />
          <BarList items={[{ label: 'Landscape', value: 14 }]} />
          <LineChart data={[{ date: '2026-10-01', count: 4 }, { date: '2026-10-02', count: 9 }]} label="Views per day" />
          <DonutChart items={[{ label: 'Landscape', value: 3 }, { label: 'Nature', value: 1 }]} />
          <DataTable columns={[{ key: 'name', header: 'Name' }]} rows={[{ id: 1, name: 'Ada' }]} />
          <ToastStack toasts={[{ id: '1', message: 'Saved', type: 'success' }]} onDismiss={() => {}} />
        </Providers>
      </MemoryRouter>,
    );
    expect(html).toContain('Morning on the River');
    expect(html).toContain('Strong');
    expect(html).toContain('2,140');
  });
});
