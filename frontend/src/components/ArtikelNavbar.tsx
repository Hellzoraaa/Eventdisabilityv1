import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArtikelItem,
  articleHref,
  formatTanggal,
  ARTIKEL_LIST,
  getCategories,
  hrefCari,
  hrefKategori,
  isPlainClick,
  searchArticles,
} from './Artikelutils,ts';

interface ArtikelNavbarProps {
  articles: ArtikelItem[];
  activeCategory?: string | null;
  /** href tiap tab kategori. null = "Semua". */
  categoryHref?: (name: string | null) => string;
  /** Jika diisi, klik kategori tidak reload halaman (dipakai di halaman daftar). */
  onCategoryChange?: (name: string | null) => void;
  /** Mode terkontrol (halaman daftar): ketikan langsung memfilter daftar. */
  query?: string;
  onQueryChange?: (q: string) => void;
  getHref?: (a: ArtikelItem) => string;
  onOpen?: (a: ArtikelItem) => void;
}

const defaultCategoryHref = hrefKategori;

const ArtikelNavbar: React.FC<ArtikelNavbarProps> = ({
  articles,
  activeCategory = null,
  categoryHref = defaultCategoryHref,
  onCategoryChange,
  query,
  onQueryChange,
  getHref,
  onOpen,
}) => {
  const [localQ, setLocalQ] = useState('');
  const q = query ?? localQ;
  const setQ = (v: string) => (onQueryChange ? onQueryChange(v) : setLocalQ(v));

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);

  const categories = useMemo(() => getCategories(articles), [articles]);
  const suggestions = useMemo(
    () => (q.trim().length >= 2 ? searchArticles(articles, q).slice(0, 6) : []),
    [articles, q]
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const hrefOf = (a: ArtikelItem) => (getHref ? getHref(a) : articleHref(a));
  const openArticle = (a: ArtikelItem) => {
    setOpen(false);
    if (onOpen) onOpen(a);
    else window.location.assign(hrefOf(a));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return setOpen(false);
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && idx >= 0) {
      e.preventDefault();
      openArticle(suggestions[idx]);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onQueryChange) return setOpen(false); // daftar sudah terfilter langsung
    if (q.trim()) window.location.assign(hrefCari(q.trim()));
  };

  const tab = (label: string, value: string | null, count?: number) => {
    const active = (activeCategory ?? null) === value;
    return (
      <li key={label} className="shrink-0">
        <a
          href={categoryHref(value)}
          aria-current={active ? 'page' : undefined}
          onClick={(e) => {
            if (onCategoryChange && isPlainClick(e)) {
              e.preventDefault();
              onCategoryChange(value);
            }
          }}
          className={`block border-b-[3px] px-3 py-3 text-sm focus:outline-none focus-visible:bg-green-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-700 ${
            active
              ? 'border-yellow-500 font-bold text-green-900'
              : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-green-900'
          }`}
        >
          {label}
          {count !== undefined && <span className="ml-1 text-xs text-gray-400">({count})</span>}
        </a>
      </li>
    );
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={ARTIKEL_LIST}
            onClick={(e) => {
              if (onCategoryChange && isPlainClick(e)) {
                e.preventDefault();
                onCategoryChange(null);
                setQ('');
              }
            }}
            className="text-xl font-extrabold text-green-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
          >
            Pustaka Artikel
          </a>

          <form ref={boxRef} role="search" onSubmit={submit} className="relative w-full sm:w-80">
            <label htmlFor="artikel-cari" className="sr-only">
              Cari artikel
            </label>
            <input
              id="artikel-cari"
              type="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="artikel-saran"
              aria-activedescendant={idx >= 0 ? `artikel-saran-${idx}` : undefined}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
                setIdx(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Cari artikel"
              className="w-full rounded-md border border-gray-300 bg-gray-50 py-2 pl-3 pr-16 text-sm focus:border-green-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-700/40"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 rounded bg-green-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-1"
            >
              Cari
            </button>

            {open && suggestions.length > 0 && (
              <ul
                id="artikel-saran"
                role="listbox"
                className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
              >
                {suggestions.map((a, i) => (
                  <li key={a.id} id={`artikel-saran-${i}`} role="option" aria-selected={i === idx}>
                    <a
                      href={hrefOf(a)}
                      onClick={(e) => {
                        if (onOpen && isPlainClick(e)) {
                          e.preventDefault();
                          openArticle(a);
                        }
                      }}
                      onMouseEnter={() => setIdx(i)}
                      className={`block px-3 py-2 text-sm ${i === idx ? 'bg-green-50' : ''}`}
                    >
                      <span className="block font-semibold text-gray-900">{a.title}</span>
                      <span className="block text-xs text-gray-500">
                        {[a.category, formatTanggal(a.date)].filter(Boolean).join(', ')}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </div>

        <nav aria-label="Kategori artikel" className="-mx-4 mt-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          <ul className="flex min-w-max">
            {tab('Semua', null)}
            {categories.map((c) => tab(c.name, c.name, c.count))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default ArtikelNavbar;
