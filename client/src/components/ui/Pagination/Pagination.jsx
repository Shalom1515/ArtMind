import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Pagination.css';

function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page, page - 1, page + 1]);
  const sorted = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push('gap' + n);
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, pages, onChange, variant = 'underline', arrows = variant === 'boxed', className }) {
  if (!pages || pages <= 1) return null;
  const go = (n) => {
    if (n >= 1 && n <= pages && n !== page) onChange(n);
  };

  return (
    <nav className={cx('pagination', `pagination--${variant}`, className)} aria-label="Pages">
      {arrows && (
        <button type="button" className="pagination__arrow" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <Icon name="chevronLeft" size={16} />
        </button>
      )}
      <ul className="pagination__list">
        {pageList(page, pages).map((n) =>
          typeof n === 'string' ? (
            <li key={n} className="pagination__gap" aria-hidden="true">...</li>
          ) : (
            <li key={n}>
              <button
                type="button"
                className={cx('pagination__page', n === page && 'pagination__page--current')}
                onClick={() => go(n)}
                aria-current={n === page ? 'page' : undefined}
                aria-label={`Page ${n}`}
              >
                {n}
              </button>
            </li>
          ),
        )}
      </ul>
      {arrows && (
        <button type="button" className="pagination__arrow" onClick={() => go(page + 1)} disabled={page >= pages} aria-label="Next page">
          <Icon name="chevronRight" size={16} />
        </button>
      )}
    </nav>
  );
}
