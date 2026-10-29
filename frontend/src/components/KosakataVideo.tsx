import React, { useState } from 'react';
import { Icon } from './Icon.tsx';

export type VideoSource =
  | { kind: 'youtube'; id: string }
  | { kind: 'youtube-playlist'; id: string }
  | { kind: 'vimeo'; id: string }
  | { kind: 'drive'; id: string }
  | { kind: 'file'; src: string }
  | { kind: 'link'; href: string };

/** Mengenali jenis tautan video. Mengembalikan null bila tautan kosong/tidak valid. */
export function parseVideoUrl(raw: string): VideoSource | null {
  const text = (raw || '').trim();
  if (!text) return null;
  let u: URL;
  try { u = new URL(text); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;

  const host = u.hostname.replace(/^(www|m)\./, '');
  const parts = u.pathname.split('/').filter(Boolean);
  const ytId = /^[\w-]{11}$/;

  if (host === 'youtu.be' && ytId.test(parts[0] || '')) return { kind: 'youtube', id: parts[0] };
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const playlistId = u.searchParams.get('list');
    if (playlistId && u.pathname.includes('playlist')) return { kind: 'youtube-playlist', id: playlistId };
    const v = u.searchParams.get('v');
    if (v && ytId.test(v)) return { kind: 'youtube', id: v };
    if (['embed', 'shorts', 'live', 'v'].includes(parts[0]) && ytId.test(parts[1] || '')) return { kind: 'youtube', id: parts[1] };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = [...parts].reverse().find(p => /^\d+$/.test(p));
    if (id) return { kind: 'vimeo', id };
  }
  if (host === 'drive.google.com' && parts[0] === 'file' && parts[1] === 'd' && parts[2]) {
    return { kind: 'drive', id: parts[2] };
  }
  if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { kind: 'file', src: text };
  return { kind: 'link', href: text };
}

interface VideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
}

/**
 * Pemutar video di dalam halaman (tanpa pindah ke situs lain).
 * Video baru dimuat setelah diklik supaya halaman dengan banyak kosakata tetap ringan.
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title = 'Video isyarat', className = '' }) => {
  const [playing, setPlaying] = useState(false);
  const src = parseVideoUrl(url);
  if (!src) return null;

  if (src.kind === 'youtube-playlist') {
    if (playing) {
      return (
        <div className="fixed inset-0 z-[100] min-h-screen overflow-y-auto bg-white text-slate-900" role="dialog" aria-modal="true" aria-label="Pemutar video Kosa Isyarat">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
            <div><h1 className="text-xl font-extrabold text-[#006316]">Video Kosa Isyarat</h1><p className="mt-1 text-sm text-slate-500">Putar video langsung di halaman ini</p></div>
            <button type="button" onClick={() => setPlaying(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Tutup</button>
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
            <div className="mb-5"><h2 className="text-lg font-bold">Playlist Kosa Isyarat</h2><p className="mt-1 text-sm text-slate-600">Pilih video dari daftar playlist di dalam pemutar.</p></div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
              <iframe src={`https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(src.id)}&rel=0&playsinline=1`} title={title} className="absolute inset-0 h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          </main>
        </div>
      );
    }
    return <button type="button" onClick={() => setPlaying(true)} className={`inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline ${className}`}><Icon name="play_circle" className="text-[16px]" />Lihat video</button>;
  }

  if (src.kind === 'link') {
    return (
      <a href={src.href} target="_blank" rel="noreferrer noopener" className={`text-[12px] font-semibold text-primary hover:underline inline-flex items-center gap-1 ${className}`}>
        <Icon name="play_circle" className="text-[16px]" />Lihat video
      </a>
    );
  }

  const frame = 'relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900';

  if (src.kind === 'file') {
    return (
      <div className={`${frame} ${className}`}>
        <video className="absolute inset-0 w-full h-full" controls preload="metadata" playsInline aria-label={title}>
          <source src={src.src} />
        </video>
      </div>
    );
  }

  const embedUrl =
    src.kind === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${src.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
      : src.kind === 'vimeo'
        ? `https://player.vimeo.com/video/${src.id}?autoplay=1`
        : `https://drive.google.com/file/d/${src.id}/preview`;

  if (playing) {
    return (
      <div className={`${frame} ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Putar video: ${title}`}
      className={`${frame} group cursor-pointer block ${className}`}
    >
      {src.kind === 'youtube' && (
        <img
          src={`https://i.ytimg.com/vi/${src.id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-14 h-14 rounded-full bg-white/95 text-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <Icon name="play_arrow" className="text-[32px]" />
        </span>
      </span>
    </button>
  );
};