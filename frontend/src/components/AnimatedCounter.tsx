import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  /** Angka tujuan (data asli). */
  value: number;
  /** Lama animasi dalam milidetik. */
  duration?: number;
  className?: string;
}

/**
 * Angka yang menghitung dari 0 sampai `value`.
 * - Mulai saat elemen terlihat di layar (bukan saat halaman dibuka).
 * - Kalau `value` berubah (mis. data baru selesai dimuat), angka melanjutkan
 *   dari angka yang sedang tampil menuju nilai baru.
 * - Menghormati pengaturan "reduce motion" pengguna.
 * - Pembaca layar membaca angka akhirnya saja (bukan angka yang berubah-ubah).
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 1800, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(0);
  const [display, setDisplay] = useState(0);
  const [visible, setVisible] = useState(false);

  // Tunggu sampai elemen masuk layar
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Jalankan animasi
  useEffect(() => {
    if (!visible) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || duration <= 0) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    const from = currentRef.current;
    const startTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const next = Math.round(from + (value - from) * eased);
      currentRef.current = next;
      setDisplay(next);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration]);

  return (
    <>
      <span ref={ref} className={className} aria-hidden="true">
        {display.toLocaleString('id-ID')}
      </span>
      <span className="sr-only">{value.toLocaleString('id-ID')}</span>
    </>
  );
};
