import { useId, useState } from 'react';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Accordion.css';

export default function Accordion({ items = [], defaultOpen = 0, allowMany = false, className }) {
  const baseId = useId();
  const [open, setOpen] = useState(defaultOpen === null ? [] : [defaultOpen]);

  const toggle = (index) => {
    setOpen((current) => {
      if (current.includes(index)) return current.filter((i) => i !== index);
      return allowMany ? [...current, index] : [index];
    });
  };

  return (
    <div className={cx('accordion', className)}>
      {items.map((item, index) => {
        const isOpen = open.includes(index);
        const buttonId = `${baseId}-b${index}`;
        const panelId = `${baseId}-p${index}`;
        return (
          <div key={index} className={cx('accordion__item', isOpen && 'accordion__item--open')}>
            <h3 className="accordion__heading">
              <button
                id={buttonId}
                type="button"
                className="accordion__button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                <span>{item.question ?? item.title}</span>
                <Icon name={isOpen ? 'minus' : 'plus'} size={18} />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} className="accordion__panel" hidden={!isOpen}>
              {typeof (item.answer ?? item.content) === 'string' ? <p>{item.answer ?? item.content}</p> : (item.answer ?? item.content)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
