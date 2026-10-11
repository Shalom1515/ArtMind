import { Children, useCallback, useEffect, useRef, useState } from 'react';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Carousel.css';

export default function Carousel({ children, itemWidth = '72%', gap = 16, label = 'More items', arrows = true, className }) {
  const track = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update, children]);

  const scroll = (dir) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={cx('carousel', className)} style={{ '--carousel-item': itemWidth, '--carousel-gap': `${gap}px` }}>
      {arrows && !edges.start && (
        <button type="button" className="carousel__arrow carousel__arrow--prev" onClick={() => scroll(-1)} aria-label="Previous">
          <Icon name="chevronLeft" size={20} />
        </button>
      )}
      <ul ref={track} className="carousel__track" aria-label={label}>
        {Children.toArray(children).map((child, index) => (
          <li key={child.key ?? index} className="carousel__item">
            {child}
          </li>
        ))}
      </ul>
      {arrows && !edges.end && (
        <button type="button" className="carousel__arrow carousel__arrow--next" onClick={() => scroll(1)} aria-label="Next">
          <Icon name="chevronRight" size={20} />
        </button>
      )}
    </div>
  );
}
