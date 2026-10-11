import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Swatch.css';

export default function Swatch({ colour, label, showHex = false, selected = false, onClick, size = 'md', className }) {
  const name = label || colour;
  const square = <span className="swatch__colour" style={{ background: colour }} />;

  if (onClick) {
    return (
      <button
        type="button"
        className={cx('swatch', 'swatch--button', `swatch--${size}`, selected && 'swatch--selected', className)}
        onClick={onClick}
        aria-pressed={selected}
        aria-label={name}
        title={name}
      >
        {square}
        {selected && <Icon name="check" size={14} strokeWidth={2.4} className="swatch__tick" />}
      </button>
    );
  }

  return (
    <span className={cx('swatch', `swatch--${size}`, className)} title={name}>
      {square}
      {showHex ? <span className="swatch__hex">{colour.toUpperCase()}</span> : <span className="visually-hidden">{name}</span>}
    </span>
  );
}
