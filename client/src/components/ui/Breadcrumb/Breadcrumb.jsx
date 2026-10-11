import { Link } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import './Breadcrumb.css';

export default function Breadcrumb({ items = [], className }) {
  if (!items.length) return null;
  return (
    <nav className={cx('breadcrumb', className)} aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}${index}`}>
              {last || !item.to ? (
                <span aria-current={last ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
