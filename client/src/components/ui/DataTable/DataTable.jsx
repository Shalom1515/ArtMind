import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import Skeleton from '../Skeleton/Skeleton.jsx';
import './DataTable.css';

export default function DataTable({
  columns,
  rows = [],
  rowKey = (row) => row.id,
  loading = false,
  empty = 'Nothing to show yet.',
  caption,
  mobile = 'scroll',
  onRowClick,
  selectedKey,
  sortKey,
  sortDir = 'asc',
  onSort,
  className,
}) {
  const cell = (column, row) => (column.render ? column.render(row) : row[column.key]);

  const head = (c) => {
    if (!c.sortable || !onSort) return c.header;
    const active = sortKey === c.key;
    return (
      <button type="button" className={cx('data-table__sort', active && 'data-table__sort--on')} onClick={() => onSort(c.key)}>
        {c.header}
        <Icon name={active && sortDir === 'desc' ? 'chevronDown' : 'chevronUp'} size={12} strokeWidth={2} />
      </button>
    );
  };

  return (
    <div className={cx('data-table', `data-table--${mobile}`, className)}>
      <div className="data-table__scroller">
        <table>
          {caption && <caption className="visually-hidden">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={{ width: c.width, textAlign: c.align }}
                  className={cx(c.hideOnPhone && 'data-table__hide')}
                  aria-sort={c.sortable && onSort ? (sortKey === c.key ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none') : undefined}
                >
                  {head(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={`loading${i}`}>
                  {columns.map((c) => (
                    <td key={c.key} data-label={typeof c.header === 'string' ? c.header : undefined}>
                      <Skeleton height={14} />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="data-table__empty">{empty}</td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    className={cx(onRowClick && 'data-table__row--click', selectedKey === key && 'data-table__row--selected')}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        style={{ textAlign: c.align }}
                        className={cx(c.hideOnPhone && 'data-table__hide')}
                        data-label={typeof c.header === 'string' ? c.header : undefined}
                      >
                        {cell(c, row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
