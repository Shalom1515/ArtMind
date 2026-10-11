import { Link, useSearchParams } from 'react-router-dom';
import { getOverview } from '../../../api/admin.js';
import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import BarList from '../../../components/ui/BarList/BarList.jsx';
import DataTable from '../../../components/ui/DataTable/DataTable.jsx';
import DonutChart from '../../../components/ui/DonutChart/DonutChart.jsx';
import { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import LineChart from '../../../components/ui/LineChart/LineChart.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import Skeleton, { Loading } from '../../../components/ui/Skeleton/Skeleton.jsx';
import StatTile from '../../../components/ui/StatTile/StatTile.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { CATEGORIES } from '../../../utils/constants.js';
import { timeAgo } from '../../../utils/format.js';
import './Overview.css';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];
const ACTIVITY_ICONS = { search: 'search', register: 'user', favourite: 'heart', view: 'eye' };

function Panel({ title, id, className, children }) {
  return (
    <section className={`card page-admin-overview__panel ${className || ''}`} aria-labelledby={id}>
      <h2 id={id} className="page-admin-overview__panel-title">{title}</h2>
      {children}
    </section>
  );
}

function OverviewLoading() {
  return (
    <Loading label="Loading the overview">
      <div className="page-admin-overview__tiles">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={92} />
        ))}
      </div>
      <div className="page-admin-overview__grid">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={260} />
        ))}
      </div>
    </Loading>
  );
}

export default function Overview() {
  useDocumentTitle('Admin overview');
  const [params, setParams] = useSearchParams();
  const range = RANGES.some((r) => r.value === params.get('range')) ? params.get('range') : '30';
  const { data, error, loading, reload } = useApi(() => getOverview(Number(range)), [range]);

  const changeRange = (value) => {
    const next = new URLSearchParams(params);
    if (value === '30') next.delete('range');
    else next.set('range', value);
    setParams(next);
  };

  const byCategory = data
    ? CATEGORIES.map((name) => {
        const row = data.viewsByCategory.find((c) => c.category === name);
        return { label: name, value: row?.count || 0, percent: row?.percent || 0 };
      }).sort((a, b) => b.value - a.value)
    : [];

  const tiles = data
    ? [
        ['Paintings', data.totals.paintings],
        ['Artists', data.totals.artists],
        ['Users', data.totals.users],
        ['Views', data.totals.views],
        ['Searches', data.totals.searches],
      ]
    : [];

  return (
    <div className="page-admin-overview">
      <AdminHeader title="Overview">
        <Select
          value={range}
          onChange={changeRange}
          options={RANGES}
          size="sm"
          placeholder="Time range"
          required
          className="page-admin-overview__range"
        />
      </AdminHeader>

      {loading && !data && <OverviewLoading />}
      {error && <ErrorState error={error} onRetry={reload} title="We could not load the overview." />}

      {data && !error && (
        <div className={loading ? 'page-admin-overview__busy' : undefined} aria-busy={loading || undefined}>
          <ul className="page-admin-overview__tiles" aria-label="Totals">
            {tiles.map(([label, value]) => (
              <li key={label}>
                <StatTile value={value} label={label} />
              </li>
            ))}
          </ul>

          <div className="page-admin-overview__grid">
            <Panel title="Views per day" id="viewsTitle">
              <LineChart data={data.viewsPerDay} label={`Views per day, last ${range} days`} valueLabel="Views" xLabel="Days" />
            </Panel>

            <Panel title="Top paintings" id="topTitle">
              {data.topPaintings.length ? (
                <BarList items={data.topPaintings.map((p) => ({ label: p.title, value: p.views }))} label="Top paintings by views" />
              ) : (
                <p className="muted">No views in this time.</p>
              )}
            </Panel>

            <Panel title="Searches per day" id="searchesTitle">
              <LineChart data={data.searchesPerDay} label={`Searches per day, last ${range} days`} valueLabel="Searches" xLabel="Days" />
            </Panel>

            <Panel title="Views by category" id="categoryTitle">
              <DonutChart items={byCategory} size={170} label="Share of views by category" />
            </Panel>

            <Panel title="Top search queries" id="queriesTitle" className="page-admin-overview__wide">
              <DataTable
                caption="Top search queries"
                columns={[
                  { key: 'query', header: 'Query' },
                  { key: 'count', header: 'Count', width: '25%' },
                ]}
                rows={data.topQueries}
                rowKey={(row) => row.query}
                empty="No searches in this time."
                mobile="fit"
              />
            </Panel>

            <Panel title="Recent activity" id="activityTitle" className="page-admin-overview__wide">
              {data.recentActivity.length ? (
                <ul className="page-admin-overview__activity">
                  {data.recentActivity.map((item, i) => (
                    <li key={`${item.at}${i}`} className="page-admin-overview__event">
                      {item.painting ? (
                        <Link to={`/paintings/${item.painting.slug}`} className="page-admin-overview__thumb" aria-label={item.painting.title}>
                          <FramedImage src={item.painting.image} alt="" tones={item.painting.tones} ratio="4 / 3" />
                        </Link>
                      ) : (
                        <span className="page-admin-overview__thumb page-admin-overview__thumb--icon" aria-hidden="true">
                          <Icon name={ACTIVITY_ICONS[item.type] || 'info'} size={16} />
                        </span>
                      )}
                      <span className="page-admin-overview__text">{item.text}</span>
                      <time className="page-admin-overview__time" dateTime={item.at}>{timeAgo(item.at)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nothing has happened yet.</p>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
