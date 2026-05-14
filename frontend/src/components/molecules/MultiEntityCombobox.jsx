import React from 'react';

const defaultGetId = (item) => item?.id ?? item?.interface_name ?? item?.username ?? item?.name ?? item?.value ?? '';
const defaultGetLabel = (item) => item?.name ?? item?.label ?? item?.interface_name ?? item?.username ?? item?.value ?? '';
const defaultGetMeta = (item) => item?.metadata ?? item;

const MultiEntityCombobox = ({
  items = [],
  value = [],
  onChange,
  placeholder = 'Pilih entitas…',
  maxSelected = 200,
  onSearch,
  itemHeight = 36,
  getId = defaultGetId,
  getLabel = defaultGetLabel,
  getMeta = defaultGetMeta,
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(-1);
  const [viewportH, setViewportH] = React.useState(320);
  const [results, setResults] = React.useState(items);
  const [loading, setLoading] = React.useState(false);
  const boxRef = React.useRef(null);
  const listRef = React.useRef(null);

  const selectedMap = React.useMemo(() => {
    const m = new Map();
    (Array.isArray(value) ? value : []).forEach((v) => {
      m.set(getId(v), v);
    });
    return m;
  }, [value, getId]);

  React.useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    if (!node) return;
    const r = () => setViewportH(node.clientHeight || 320);
    r();
    const ro = new ResizeObserver(r);
    ro.observe(node);
    return () => ro.disconnect();
  }, [open]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (onSearch) {
        try {
          setLoading(true);
          const r = await onSearch(query);
          if (!cancelled) setResults(Array.isArray(r) ? r : []);
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        const q = (query || '').toLowerCase();
        const r = (items || []).filter((it) => defaultGetLabel(it).toLowerCase().includes(q));
        setResults(r);
      }
    };
    const t = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, onSearch, items]);

  const filtered = results || [];
  const total = filtered.length;

  const [scrollTop, setScrollTop] = React.useState(0);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 6);
  const visibleCount = Math.ceil(viewportH / itemHeight) + 12;
  const endIndex = Math.min(total, startIndex + visibleCount);
  const before = startIndex * itemHeight;
  const after = Math.max(0, (total - endIndex) * itemHeight);
  const slice = filtered.slice(startIndex, endIndex);

  const countSelected = (Array.isArray(value) ? value.length : 0);
  const reachedMax = countSelected >= maxSelected;

  const setSelectedByIds = (ids) => {
    const next = [];
    const all = new Map();
    (results || items || []).forEach((it) => all.set(getId(it), it));
    ids.forEach((id) => {
      const base = all.get(id);
      if (base) next.push({ id: getId(base), name: getLabel(base), metadata: getMeta(base) });
    });
    if (onChange) onChange(next);
  };

  const toggleItem = (item) => {
    const id = getId(item);
    const copy = new Map(selectedMap);
    if (copy.has(id)) {
      copy.delete(id);
    } else {
      if (reachedMax) return;
      copy.set(id, { id, name: getLabel(item), metadata: getMeta(item) });
    }
    setSelectedByIds(Array.from(copy.keys()));
  };

  const selectAll = () => {
    if (filtered.length === 0) return;
    const ids = [];
    for (let i = 0; i < filtered.length && ids.length < maxSelected; i++) {
      const id = getId(filtered[i]);
      if (!selectedMap.has(id)) ids.push(id);
    }
    const merged = Array.from(selectedMap.keys()).concat(ids).slice(0, maxSelected);
    setSelectedByIds(merged);
  };

  const deselectAll = () => {
    const remaining = Array.from(selectedMap.keys()).filter((id) => !filtered.some((it) => getId(it) === id));
    setSelectedByIds(remaining);
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min((h < 0 ? 0 : h + 1), total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlight >= 0 && highlight < total) {
        const item = filtered[highlight];
        toggleItem(item);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Home') {
      setHighlight(0);
    } else if (e.key === 'End') {
      setHighlight(total - 1);
    }
  };

  React.useEffect(() => {
    if (!open) return;
    if (highlight < 0) return;
    const top = highlight * itemHeight;
    if (top < scrollTop || top > scrollTop + viewportH - itemHeight) {
      const node = listRef.current;
      if (node) {
        node.scrollTop = Math.max(0, top - Math.floor(viewportH / 3));
      }
    }
  }, [highlight, open, itemHeight, scrollTop, viewportH]);

  const displayText = countSelected > 0 ? `${countSelected} terpilih` : '';

  return (
    <div className="relative w-full" ref={boxRef}>
      <div
        className="w-full border border-gray-300 rounded px-2 py-1 text-sm flex items-center justify-between cursor-text bg-white"
        role="combobox"
        aria-expanded={open}
        aria-controls="multi-entity-listbox"
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <input
          className="flex-1 min-w-0 outline-none bg-transparent"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          aria-label="Cari entitas"
        />
        <span className="ml-2 text-xs text-gray-600">{displayText}</span>
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 flex items-center justify-between border-b border-gray-100">
            <div className="text-[11px] text-gray-600">{total} item</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                onClick={selectAll}
                disabled={reachedMax || total === 0}
                title={reachedMax ? 'Maksimal tercapai' : 'Pilih semua hasil pencarian'}
              >
                Select All
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                onClick={deselectAll}
                disabled={countSelected === 0}
              >
                Deselect All
              </button>
            </div>
          </div>
          <div
            id="multi-entity-listbox"
            role="listbox"
            ref={listRef}
            className="max-h-64 overflow-auto"
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          >
            <div style={{ height: before }} />
            {slice.map((it, i) => {
              const idx = startIndex + i;
              const id = getId(it);
              const label = getLabel(it);
              const sel = selectedMap.has(id);
              const active = idx === highlight;
              return (
                <label
                  key={id || `${label}-${idx}`}
                  role="option"
                  aria-selected={sel}
                  title={label.length > 24 ? label : undefined}
                  className={`flex items-center gap-2 px-3 h-9 text-sm cursor-pointer select-none ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onMouseEnter={() => setHighlight(idx)}
                  style={{ height: itemHeight }}
                >
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={sel}
                    onChange={() => toggleItem(it)}
                    disabled={!sel && reachedMax}
                  />
                  <span className="truncate">{label}</span>
                </label>
              );
            })}
            <div style={{ height: after }} />
            {loading && (
              <div className="px-3 py-2 text-xs text-gray-500">Memuat…</div>
            )}
            {!loading && total === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500">Tidak ada hasil</div>
            )}
          </div>
          <div className="p-2 border-t border-gray-100 flex items-center justify-between">
            <div className="text-[11px] text-gray-600">Maksimal {maxSelected} entitas</div>
            <button
              type="button"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiEntityCombobox;

