import { useState, useMemo } from 'react';
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ colKey, sortKey, sortDir }) {
  if (colKey !== sortKey) {
    return <ChevronsUpDown size={12} className="ml-1 inline opacity-30" />;
  }
  return sortDir === 'asc'
    ? <ChevronUp   size={12} className="ml-1 inline" style={{ color: 'var(--color-primary)' }} />
    : <ChevronDown size={12} className="ml-1 inline" style={{ color: 'var(--color-primary)' }} />;
}

// ─── Pagination Footer ────────────────────────────────────────────────────────

function PaginationBar({ meta, onPageChange }) {
  if (!meta || meta.pages <= 1) return null;
  const { page, pages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div
      className="flex items-center justify-between px-4 py-3 text-sm select-none"
      style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
    >
      <span className="tabular-nums">
        {total > 0 ? `${from}–${to} de ${total}` : '0 resultados'}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ hover: 'bg-gray-100' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--color-body-bg)'; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 font-medium tabular-nums">{page} / {pages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--color-body-bg)'; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--color-muted)' }}>
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      Cargando…
    </div>
  );
}

// ─── DataTable ─────────────────────────────────────────────────────────────────
/**
 * Props:
 *
 * columns         [{ key, label, sortable?, render?(val,row,idx), className?, headerClassName?, width? }]
 * data            Row array
 * keyField        Unique row identifier (default 'id')
 * loading         Show loading spinner
 * emptyIcon       ReactNode shown above emptyMessage
 * emptyMessage    Text when no rows
 * emptySubMessage Secondary text when no rows
 *
 * --- Search (integrated in header bar) ---
 * searchValue     Controlled value (for server-side search)
 * onSearchChange  Callback(val) — if provided, renders search input in header
 * searchPlaceholder
 *
 * --- Server-side pagination ---
 * pagination      { meta: {page, pages, total, limit}, onPageChange }
 *
 * --- Client-side (when pagination not provided) ---
 * pageSize        Rows per page (default 25)
 *
 * --- Sort ---
 * sortKey / sortDir / onSort(key, dir)  Server-side sort
 * (when onSort is absent, sortable columns sort client-side)
 *
 * --- Toolbar ---
 * toolbar         ReactNode rendered on the right of the header bar
 *
 * --- Rows ---
 * rowClassName    (row) => string
 * onRowClick      (row) => void
 */
export default function DataTable({
  columns = [],
  data    = [],
  keyField = 'id',

  loading         = false,
  emptyIcon       = null,
  emptyMessage    = 'No hay registros',
  emptySubMessage = null,

  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar…',

  pagination,   // { meta, onPageChange }
  pageSize = 25,

  sortKey:  externalSortKey,
  sortDir:  externalSortDir,
  onSort,

  toolbar,
  rowClassName,
  onRowClick,
}) {
  /* ── Local state (client-side mode) ───────────────────────────────────── */
  const [localSearch, setLocalSearch] = useState('');
  const [localPage,   setLocalPage]   = useState(1);
  const [localSort,   setLocalSort]   = useState({ key: null, dir: 'asc' });

  const isServerSide = !!pagination;
  const isServerSort = !!onSort;
  const searchIsControlled = onSearchChange !== undefined;

  /* ── Effective sort values ─────────────────────────────────────────────── */
  const activeSortKey = isServerSort ? externalSortKey : localSort.key;
  const activeSortDir = isServerSort ? externalSortDir : localSort.dir;

  /* ── Client-side search filter ─────────────────────────────────────────── */
  const effectiveSearch = searchIsControlled ? (searchValue || '') : localSearch;

  const filteredData = useMemo(() => {
    if (isServerSide) return data;
    if (!effectiveSearch) return data;
    const q = effectiveSearch.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        if (!col.key || col.key.startsWith('_')) return false;
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, effectiveSearch, isServerSide, columns]);

  /* ── Client-side sort ──────────────────────────────────────────────────── */
  const sortedData = useMemo(() => {
    if (isServerSort || !localSort.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[localSort.key] ?? '';
      const bVal = b[localSort.key] ?? '';
      const cmp  = String(aVal).localeCompare(String(bVal), 'es', { numeric: true, sensitivity: 'base' });
      return localSort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, localSort, isServerSort]);

  /* ── Client-side pagination ─────────────────────────────────────────────── */
  const totalLocal      = sortedData.length;
  const totalPagesLocal = Math.max(1, Math.ceil(totalLocal / pageSize));
  const safePage        = Math.min(localPage, totalPagesLocal);

  const displayData = isServerSide
    ? data
    : sortedData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const meta = isServerSide
    ? pagination.meta
    : { page: safePage, pages: totalPagesLocal, total: totalLocal, limit: pageSize };

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleSearch = (val) => {
    if (searchIsControlled) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
      setLocalPage(1);
    }
  };

  const handleSort = (col) => {
    if (!col.sortable) return;
    if (isServerSort) {
      const newDir = externalSortKey === col.key && externalSortDir === 'asc' ? 'desc' : 'asc';
      onSort(col.key, newDir);
    } else {
      setLocalSort(prev => ({
        key: col.key,
        dir: prev.key === col.key && prev.dir === 'asc' ? 'desc' : 'asc',
      }));
      setLocalPage(1);
    }
  };

  const handlePageChange = (newPage) => {
    if (isServerSide) {
      pagination.onPageChange(newPage);
    } else {
      setLocalPage(newPage);
    }
  };

  /* ── Show header bar when search or toolbar is present ─────────────────── */
  const showHeader = searchIsControlled || (!isServerSide && !pagination) || toolbar;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="card overflow-hidden">

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      {showHeader && (
        <div
          className="flex items-center gap-3 px-4 py-3 flex-wrap"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {/* Search input */}
          <div className="relative flex-1" style={{ minWidth: '180px', maxWidth: '320px' }}>
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-muted)' }}
            />
            <input
              type="search"
              value={searchIsControlled ? (searchValue || '') : localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="input pl-9 text-sm w-full"
              style={{ height: '36px' }}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Toolbar actions */}
          {toolbar && (
            <div className="flex items-center gap-2 flex-wrap">
              {toolbar}
            </div>
          )}
        </div>
      )}

      {/* ── Table body ──────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingState />
      ) : displayData.length === 0 ? (
        <div className="text-center py-16">
          {emptyIcon && (
            <div className="mx-auto mb-3" style={{ color: '#d1d5db' }}>
              {emptyIcon}
            </div>
          )}
          <p className="font-medium" style={{ color: 'var(--color-base)' }}>{emptyMessage}</p>
          {emptySubMessage && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{emptySubMessage}</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-body-bg)', borderBottom: '1px solid var(--color-border)' }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap
                      ${col.sortable ? 'cursor-pointer select-none' : ''}
                      ${col.headerClassName || ''}`}
                    style={{ color: 'var(--color-muted)', width: col.width }}
                    onClick={() => col.sortable && handleSort(col)}
                    onMouseEnter={e => { if (col.sortable) e.currentTarget.style.color = 'var(--color-base)'; }}
                    onMouseLeave={e => { if (col.sortable) e.currentTarget.style.color = 'var(--color-muted)'; }}
                  >
                    {col.label}
                    {col.sortable && (
                      <SortIcon colKey={col.key} sortKey={activeSortKey} sortDir={activeSortDir} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, idx) => (
                <tr
                  key={row[keyField] ?? idx}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-body-bg)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.className || ''}`}
                      style={{ color: 'var(--color-base)' }}
                    >
                      {col.render
                        ? col.render(row[col.key], row, idx)
                        : (row[col.key] ?? <span style={{ color: 'var(--color-muted)' }}>—</span>)
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination footer ────────────────────────────────────────────── */}
      {!loading && (
        <PaginationBar meta={meta} onPageChange={handlePageChange} />
      )}
    </div>
  );
}
