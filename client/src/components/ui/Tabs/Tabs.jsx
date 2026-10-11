import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Tabs.css';

export default function Tabs({ tabs, active, onChange, variant = 'bar', label = 'Sections', className }) {
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = scroller.current;
    if (!el || variant !== 'bar') return undefined;
    const update = () => setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    el.querySelector('[aria-current="page"], [aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [variant, active]);

  const scrollBy = (dir) => scroller.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });

  const onKeyDown = (event) => {
    if (tabs.some((t) => t.to)) return;
    const index = tabs.findIndex((t) => t.key === active);
    const forward = variant === 'side' ? 'ArrowDown' : 'ArrowRight';
    const back = variant === 'side' ? 'ArrowUp' : 'ArrowLeft';
    if (event.key !== forward && event.key !== back) return;
    event.preventDefault();
    const next = tabs[(index + (event.key === forward ? 1 : -1) + tabs.length) % tabs.length];
    onChange?.(next.key);
    event.currentTarget.querySelector(`[data-key="${next.key}"]`)?.focus();
  };

  const asLinks = tabs.some((t) => t.to);

  return (
    <div className={cx('tabs', `tabs--${variant}`, className)}>
      {variant === 'bar' && !edges.start && (
        <button type="button" className="tabs__arrow tabs__arrow--left" onClick={() => scrollBy(-1)} aria-label="Scroll tabs left">
          <Icon name="chevronLeft" size={16} />
        </button>
      )}
      <nav
        ref={scroller}
        className="tabs__list"
        role={asLinks ? undefined : 'tablist'}
        aria-label={label}
        aria-orientation={!asLinks && variant === 'side' ? 'vertical' : undefined}
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const classes = cx('tabs__tab', isActive && 'tabs__tab--active');
          return tab.to ? (
            <Link key={tab.key} to={tab.to} className={classes} aria-current={isActive ? 'page' : undefined} data-key={tab.key}>
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className={classes}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange?.(tab.key)}
              data-key={tab.key}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      {variant === 'bar' && !edges.end && (
        <button type="button" className="tabs__arrow tabs__arrow--right" onClick={() => scrollBy(1)} aria-label="Scroll tabs right">
          <Icon name="chevronRight" size={16} />
        </button>
      )}
    </div>
  );
}
