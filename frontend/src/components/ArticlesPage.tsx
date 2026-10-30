import React, { useEffect, useMemo } from 'react';
import { Icon } from './Icon.tsx';
import { ApplicationSettings } from '../types.ts';
import { KosakataPublik } from './KosakataPublik.tsx';
import { loadArticleFonts, fontTagsToInlineStyle } from '../utils/articleFonts.ts';

export type ArtikelJenis = 'braille' | 'isyarat' | 'umum';
export type RouteJenis = 'braille' | 'isyarat';
export type RouteBagian = 'pedoman' | 'panduan' | 'kosa-isyarat';

export interface Article {
  slug: string;
  title: string;
  category: string;
  date: string;
  content: string;
  body: string[];
  /** Kelompok artikel. 'umum' hanya tampil di daftar "Semua Artikel". */
  jenis: ArtikelJenis;
  /** Pedoman / Panduan (kosa isyarat bukan artikel, diambil dari data kosakata). */
  bagian?: 'pedoman' | 'panduan';
  fromDatabase?: boolean;
  /** Gambar sampul: gambar pertama di dalam konten artikel (jika ada). */
  thumbnail?: string;
  /** Foto sampul yang diunggah admin. Diutamakan dibanding gambar di dalam konten. */
  coverImage?: string;
  /** Ringkasan artikel dari Manajemen Artikel. */
  excerpt?: string;
}

/* ------------------------------------------------------------------ */
/* Struktur menu: Artikel > Braille / Isyarat > Pedoman / Panduan / Kosa Isyarat */
/* ------------------------------------------------------------------ */
export const BAGIAN_LABEL: Record<RouteBagian, string> = {
  pedoman: 'Pedoman',
  panduan: 'Panduan',
  'kosa-isyarat': 'Kosa Isyarat',
};
export const JENIS_LABEL: Record<RouteJenis, string> = { braille: 'Braille', isyarat: 'Isyarat' };

const BAGIAN_BY_JENIS: Record<RouteJenis, RouteBagian[]> = {
  braille: ['pedoman', 'panduan'],
  isyarat: ['pedoman', 'panduan', 'kosa-isyarat'],
};

/** Dipakai navbar untuk membangun dropdown Artikel. */
export const ARTIKEL_MENU = (Object.keys(BAGIAN_BY_JENIS) as RouteJenis[]).map(jenis => ({
  jenis,
  label: JENIS_LABEL[jenis],
  bagian: BAGIAN_BY_JENIS[jenis].map(key => ({ key, label: BAGIAN_LABEL[key] })),
}));

/** Tautan hash: articleHref() -> #artikel, articleHref('isyarat','kosa-isyarat') -> #artikel/isyarat/kosa-isyarat */
export const articleHref = (jenis?: RouteJenis, bagian?: RouteBagian) =>
  `#artikel${jenis ? `/${jenis}` : ''}${jenis && bagian ? `/${bagian}` : ''}`;

/* ------------------------------------------------------------------ */
/* Routing lewat hash                                                  */
/* ------------------------------------------------------------------ */
export interface ArticleRoute {
  open: boolean;
  slug: string | null;
  jenis: RouteJenis | null;
  bagian: RouteBagian | null;
}

/** Buka halaman artikel (daftar) atau satu artikel lewat hash URL. */
export const openArticlesPage = (slug?: string) => {
  window.location.hash = slug ? `#artikel/${slug}` : '#artikel';
};

/**
 * "#artikel"                      -> semua artikel
 * "#artikel/braille"              -> artikel Braille
 * "#artikel/isyarat/kosa-isyarat" -> kosa isyarat
 * "#artikel/<slug>"               -> detail satu artikel
 */
export const parseArticleHash = (hash: string): ArticleRoute => {
  const closed: ArticleRoute = { open: false, slug: null, jenis: null, bagian: null };
  const m = /^#artikel(?:\/([\w-]+))?(?:\/([\w-]+))?\/?$/.exec(hash);
  if (!m) return closed;
  const [, a, b] = m;
  if (a === 'braille' || a === 'isyarat') {
    const bagian = b && BAGIAN_BY_JENIS[a].includes(b as RouteBagian) ? (b as RouteBagian) : null;
    return { open: true, slug: null, jenis: a, bagian };
  }
  return { open: true, slug: a ?? null, jenis: null, bagian: null };
};

/* ------------------------------------------------------------------ */
/* Halaman                                                             */
/* ------------------------------------------------------------------ */
interface ArticlesPageProps {
  slug: string | null;
  jenis?: RouteJenis | null;
  bagian?: RouteBagian | null;
  currentLang: 'id' | 'en';
  appSettings?: ApplicationSettings;
  /** Navbar yang sama persis dengan homepage (dikirim dari PublicLandingPage). */
  navbar: React.ReactNode;
}

const pill = (active: boolean) =>
  `px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
    active ? 'bg-[#006316] text-white border-[#006316]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
  }`;

const BULAN_ID = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];

/** "2026-10-29T09:47:00Z" atau "15 September 2024" -> "Kamis, 29 Oktober 2026". Teks yang tak dikenali dibiarkan. */
const formatArticleDate = (raw: string, id: boolean) => {
  if (!raw) return raw;
  let d: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) d = new Date(raw);
  else {
    const m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(raw.trim());
    const mi = m ? BULAN_ID.indexOf(m[2].toLowerCase()) : -1;
    if (m && mi >= 0) d = new Date(Number(m[3]), mi, Number(m[1]));
  }
  if (!d || isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(id ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};


const readingMinutes = (a: Article) => {
  const text = a.content.replace(/<[^>]*>/g, ' ').trim();
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
};

export const ArticlesPage: React.FC<ArticlesPageProps> = ({ slug, jenis = null, bagian = null, currentLang, appSettings, navbar }) => {
  const id = currentLang === 'id';

  const [databaseArticles, setDatabaseArticles] = React.useState<Article[]>([]);
  const PAGE_SIZE = 12;
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  useEffect(() => { setLimit(PAGE_SIZE); }, [jenis, bagian]);
  // Muat @font-face untuk font hasil impor agar isi artikel tampil dengan font yang dipilih penulis.
  useEffect(() => { loadArticleFonts(); }, []);

  useEffect(() => {
    let active = true;
    const apiBase = (import.meta as any).env?.VITE_API_URL || '';
    fetch(`${apiBase}/api/articles`)
      .then(response => { if (!response.ok) throw new Error('Gagal memuat artikel publik'); return response.json(); })
      .then(data => {
        if (!active || !Array.isArray(data.articles)) return;
        const mapped: Article[] = data.articles.map((item: any) => {
          const category = String(item.category || '');
          const isBraille = category.toLocaleLowerCase().includes('braille');
          const jenis: ArtikelJenis = isBraille ? 'braille' : category.toLocaleLowerCase().includes('isyarat') ? 'isyarat' : 'umum';
          const bagian: 'pedoman' | 'panduan' | undefined = category.toLocaleLowerCase().startsWith('pedoman') ? 'pedoman' : category.toLocaleLowerCase().startsWith('panduan') ? 'panduan' : undefined;
          const slugId = String(item.id || '').replace(/[^a-zA-Z0-9_-]/g, '-');
          return {
            slug: `db-${slugId}`, title: String(item.title || 'Artikel'), category, date: item.publishedAt || item.updatedAt || item.createdAt || '',
            content: String(item.content || ''), excerpt: String(item.excerpt || ''), body: [], jenis, bagian, fromDatabase: true,
            coverImage: item.coverImage ? String(item.coverImage) : undefined,
            thumbnail: item.coverImage ? String(item.coverImage) : (/<img[^>]+src=["']([^"']+)["']/i.exec(String(item.content || '')) || [])[1],
          };
        });
        setDatabaseArticles(mapped);
      })
      .catch(error => console.warn('[ArticlesPage] Artikel dari API tidak tersedia:', error));
    return () => { active = false; };
  }, []);

  const allArticles = useMemo(() => databaseArticles, [databaseArticles]);
  const article = useMemo(() => allArticles.find(a => a.slug === slug) || null, [allArticles, slug]);

  const visible = useMemo(
    () => allArticles.filter(a => (!jenis || a.jenis === jenis) && (!bagian || (bagian === 'kosa-isyarat' ? a.category === 'Kosa Isyarat' : a.bagian === bagian))),
    [allArticles, jenis, bagian]
  );

  const idx = article ? allArticles.findIndex(a => a.slug === article.slug) : -1;
  const prev = idx > 0 ? allArticles[idx - 1] : null;
  const next = idx >= 0 && idx < allArticles.length - 1 ? allArticles[idx + 1] : null;

  const sectionTitle = [
    id ? 'Artikel' : 'Articles',
    jenis ? JENIS_LABEL[jenis] : '',
    bagian ? BAGIAN_LABEL[bagian] : '',
  ].filter(Boolean).join(' - ');

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const base = appSettings?.applicationName || "AL-QUR'AN DISABILITAS";
    const prevTitle = document.title;
    document.title = article ? `${article.title} | ${base}` : `${sectionTitle} | ${base}`;
    return () => { document.title = prevTitle; };
  }, [slug, jenis, bagian]);

  const jenisBadge = (a: Article) =>
    [a.jenis !== 'umum' ? JENIS_LABEL[a.jenis] : '', a.bagian ? BAGIAN_LABEL[a.bagian] : ''].filter(Boolean).join(' • ');

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans text-slate-800 ${article || slug ? 'bg-[#F4F8F3]' : 'bg-white'}`}>
      {navbar}

      {!article && !slug && (
        <div className="w-full border-b border-slate-200">
          <nav aria-label="Breadcrumb" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-2 text-[14px] text-slate-500">
            <a href="#" className="hover:text-[#006316]">{id ? 'Beranda' : 'Home'}</a>
            <Icon name="chevron-right" className="text-[14px]" />
            <a href={articleHref()} className={jenis ? 'hover:text-[#006316]' : 'text-slate-900 font-medium'}>{id ? 'Artikel' : 'Articles'}</a>
            {jenis && (<><Icon name="chevron-right" className="text-[14px]" /><span className="text-slate-900 font-medium">{JENIS_LABEL[jenis]}</span></>)}
          </nav>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {article ? (
          /* ---------- DETAIL ARTIKEL (gaya halaman Kisah Inspiratif Kemenag) ---------- */
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-10">
            <article className="min-w-0">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500 mb-5">
                <a href="#" className="hover:text-[#006316]">{id ? 'Beranda' : 'Home'}</a>
                <span>/</span>
                <a href={articleHref()} className="hover:text-[#006316]">{id ? 'Artikel' : 'Articles'}</a>
                {article.jenis !== 'umum' && (
                  <>
                    <span>/</span>
                    <a href={articleHref(article.jenis as RouteJenis)} className="hover:text-[#006316]">{JENIS_LABEL[article.jenis as RouteJenis]}</a>
                  </>
                )}
              </nav>

              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#006316] mb-3">{article.category}</p>
              <h1 className="text-[26px] sm:text-[38px] font-extrabold text-slate-900 tracking-tight leading-[1.2]">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-500 mt-5 pb-5 border-b border-slate-200">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="person" className="text-[16px]" />
                  {id ? 'Kontributor' : 'Contributor'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar_month" className="text-[16px]" />
                  <time>{formatArticleDate(article.date, id)}</time>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="schedule" className="text-[16px]" />
                  {readingMinutes(article)} {id ? 'menit baca' : 'min read'}
                </span>
              </div>

              {article.excerpt && <p className="article-excerpt mt-6">{article.excerpt}</p>}

              {article.coverImage && (
                <img
                  src={article.coverImage}
                  alt=""
                  className="w-full aspect-[16/9] object-cover rounded-2xl mt-6"
                />
              )}

              <div className="article-body mt-8">
                <div className="article-published-html" dangerouslySetInnerHTML={{ __html: fontTagsToInlineStyle(article.content) }} />
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-10 pt-5 border-t border-slate-200">
                <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mr-1">{id ? 'Topik' : 'Topic'}</span>
                <a href={articleHref(article.jenis !== 'umum' ? (article.jenis as RouteJenis) : undefined)} className="px-3 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#006316] text-[12px] font-semibold transition-colors">
                  {article.category}
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                {prev ? (
                  <a href={`#artikel/${prev.slug}`} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#006316]/50 transition-all">
                    <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <Icon name="arrow_back" className="text-[14px]" />
                      {id ? 'Sebelumnya' : 'Previous'}
                    </span>
                    <span className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2">{prev.title}</span>
                  </a>
                ) : <span />}
                {next ? (
                  <a href={`#artikel/${next.slug}`} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#006316]/50 transition-all sm:text-right">
                    <span className="flex items-center sm:justify-end gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {id ? 'Berikutnya' : 'Next'}
                      <Icon name="arrow_forward" className="text-[14px]" />
                    </span>
                    <span className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2">{next.title}</span>
                  </a>
                ) : <span />}
              </div>
            </article>

            {/* Sidebar: artikel terkait */}
            <aside className="lg:sticky lg:top-24 self-start">
              <h2 className="text-[15px] font-extrabold text-slate-900 pb-2 mb-4 border-b-2 border-[#006316] inline-block">
                {id ? 'Artikel Lainnya' : 'More Articles'}
              </h2>
              <ul className="divide-y divide-slate-200">
                {allArticles.filter(a => a.slug !== article.slug).slice(0, 5).map(a => (
                  <li key={a.slug}>
                    <a href={`#artikel/${a.slug}`} className="group block py-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#006316]">{a.category}</span>
                      <span className="block text-[14px] font-bold text-slate-900 leading-snug mt-0.5 group-hover:text-[#006316] transition-colors line-clamp-3">{a.title}</span>
                      <span className="block text-[12px] text-slate-400 mt-1">{formatArticleDate(a.date, id)}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <a href={articleHref()} className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-semibold text-[#006316] hover:underline">
                {id ? 'Lihat semua artikel' : 'See all articles'}
                <Icon name="arrow_forward" className="text-[15px]" />
              </a>
            </aside>
          </div>
        ) : slug ? (
          /* ---------- SLUG TIDAK DITEMUKAN ---------- */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <Icon name="article" className="text-[48px] text-slate-300 mb-2" />
            <h1 className="text-[18px] font-bold text-slate-800">{id ? 'Artikel tidak ditemukan' : 'Article not found'}</h1>
            <a href={articleHref()} className="inline-block mt-4 text-[13px] font-semibold text-[#006316] hover:underline">
              {id ? 'Lihat semua artikel' : 'See all articles'}
            </a>
          </div>
        ) : (
          /* ---------- DAFTAR: Semua / Braille / Isyarat ---------- */
          <>
            <header className="mb-6">
              <h1 className="article-serif text-[32px] sm:text-[44px] font-bold text-slate-900 tracking-tight leading-tight">
                {jenis
                  ? `${id ? 'Artikel' : 'Articles'} ${JENIS_LABEL[jenis]}${bagian ? ` - ${BAGIAN_LABEL[bagian]}` : ''}`
                  : id ? 'Semua Artikel' : 'All Articles'}
              </h1>
              {bagian !== 'kosa-isyarat' && (
                <p className="text-[14px] text-slate-500 mt-3">
                  {id
                    ? `Menampilkan ${Math.min(limit, visible.length)} dari ${visible.length} artikel`
                    : `Showing ${Math.min(limit, visible.length)} of ${visible.length} articles`}
                </p>
              )}
            </header>

            {/* Tingkat 1: Semua / Braille / Isyarat */}
            <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={id ? 'Jenis artikel' : 'Article type'}>
              <a href={articleHref()} aria-current={!jenis ? 'page' : undefined} className={pill(!jenis)}>{id ? 'Semua' : 'All'}</a>
              {ARTIKEL_MENU.map(g => (
                <a key={g.jenis} href={articleHref(g.jenis)} aria-current={jenis === g.jenis ? 'page' : undefined} className={pill(jenis === g.jenis)}>
                  {g.label}
                </a>
              ))}
            </div>

            {/* Tingkat 2: Pedoman / Panduan / Kosa Isyarat (muncul setelah memilih Braille / Isyarat) */}
            {jenis && (
              <div className="flex flex-wrap gap-2 mb-6 pl-3 border-l-2 border-emerald-200" role="group" aria-label={id ? 'Bagian' : 'Section'}>
                <a href={articleHref(jenis)} aria-current={!bagian ? 'page' : undefined} className={pill(!bagian)}>{id ? 'Semua' : 'All'}</a>
                {BAGIAN_BY_JENIS[jenis].map(b => (
                  <a key={b} href={articleHref(jenis, b)} aria-current={bagian === b ? 'page' : undefined} className={pill(bagian === b)}>
                    {BAGIAN_LABEL[b]}
                  </a>
                ))}
              </div>
            )}
            {!jenis && <div className="mb-3" />}

            {bagian === 'kosa-isyarat' ? (
              <div className="bg-white border border-[#DCE8DE] rounded-3xl p-5 sm:p-8 shadow-sm">
                <KosakataPublik id={id} className="" />
              </div>
            ) : visible.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <Icon name="article" className="text-[48px] text-slate-300 mb-2" />
                <p className="text-[14px] text-slate-600">{id ? 'Belum ada artikel pada bagian ini.' : 'No articles in this section yet.'}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visible.slice(0, limit).map(art => (
                    <a
                      key={art.slug}
                      href={`#artikel/${art.slug}`}
                      className="group bg-white border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                    >
                      <div className="relative aspect-[16/9] bg-gradient-to-br from-emerald-50 to-emerald-100 overflow-hidden">
                        {art.thumbnail ? (
                          <img src={art.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <img src="/logo-quran.png" alt="" className="absolute inset-0 m-auto h-1/2 w-auto opacity-30" />
                        )}
                        <span className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] truncate px-3 py-1 rounded-full bg-white/90 text-[#006316] text-[12px] font-medium">
                          {jenisBadge(art) || art.category}
                        </span>
                      </div>
                      <div className="p-4 pb-5">
                        <time className="block text-[13px] text-slate-500 mb-2">{formatArticleDate(art.date, id)}</time>
                        <h2 className="text-[18px] sm:text-[19px] font-semibold text-slate-900 leading-snug line-clamp-3 group-hover:text-[#006316] transition-colors">
                          {art.title}
                        </h2>
                      </div>
                    </a>
                  ))}
                </div>
                {visible.length > limit && (
                  <div className="flex justify-center mt-10">
                    <button type="button" onClick={() => setLimit(l => l + PAGE_SIZE)} className="px-6 py-2.5 rounded-full border border-[#006316] text-[#006316] hover:bg-[#006316] hover:text-white text-[14px] font-semibold transition-colors">
                      {id ? 'Muat lebih banyak' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer className="w-full border-t border-[#DCE8DE] bg-white py-6 text-center text-[12px] text-slate-500">
        © 2026 Disability Event Platform Indonesia. {id ? 'Seluruh hak cipta dilindungi.' : 'All rights reserved.'}
      </footer>
    </div>
  );
};