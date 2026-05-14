import React from 'react';

const Tabs = ({ items = [], activeId, onChange, busy = false, ariaLabel = 'Tabs' }) => {
  const listRef = React.useRef(null);
  const [focusIdx, setFocusIdx] = React.useState(() => {
    const cur = activeId || (items[0]?.id || null);
    const idx = Math.max(0, items.findIndex((it) => it.id === cur));
    return idx;
  });
  React.useEffect(() => {
    const cur = activeId || (items[0]?.id || null);
    const idx = Math.max(0, items.findIndex((it) => it.id === cur));
    setFocusIdx(idx);
  }, [activeId, items]);
  const onKeyDown = (e) => {
    if (!items || items.length === 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const ni = (focusIdx + 1) % items.length;
      setFocusIdx(ni);
      const el = listRef.current?.querySelectorAll('[role="tab"]')?.[ni];
      el?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const ni = (focusIdx - 1 + items.length) % items.length;
      setFocusIdx(ni);
      const el = listRef.current?.querySelectorAll('[role="tab"]')?.[ni];
      el?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusIdx(0);
      const el = listRef.current?.querySelectorAll('[role="tab"]')?.[0];
      el?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const ni = items.length - 1;
      setFocusIdx(ni);
      const el = listRef.current?.querySelectorAll('[role="tab"]')?.[ni];
      el?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = items[focusIdx];
      if (target && typeof onChange === 'function') onChange(target.id);
    }
  };
  return (
    <div className="w-full">
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        aria-busy={busy ? 'true' : 'false'}
        onKeyDown={onKeyDown}
        className={`flex gap-2 overflow-x-auto whitespace-nowrap border-b ${busy ? 'opacity-60' : ''}`}
      >
        {items.map((it) => {
          const active = it.id === activeId;
          return (
            <button
              key={it.id}
              role="tab"
              id={`tab-${it.id}`}
              aria-selected={active ? 'true' : 'false'}
              aria-controls={`panel-${it.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(it.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 transition-colors ${
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <span>{it.label}</span>
              {busy && active && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
