import type { TrainingProposal } from '../types.ts';

/**
 * Event publik: mode public tetap mengikuti aturan lama (tidak memakai tautan undangan).
 * Event terbatas/private baru boleh muncul sebagai arsip setelah tanggal berakhirnya lewat.
 * Perbandingan memakai YYYY-MM-DD agar tidak terpengaruh zona waktu browser.
 */
const getYMD = (value: unknown): string => {
  const match = String(value ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || '';
};

const getEndDate = (event: TrainingProposal): string => {
  const explicitEnd = getYMD(event.tanggalBerakhirKegiatan);
  if (explicitEnd) return explicitEnd;

  // Kompatibilitas event lama yang belum memiliki tanggal berakhir tersimpan.
  const start = getYMD(event.tanggalKegiatan);
  const duration = String(event.durasiProgram ?? '').trim().match(/^(\d+)\s*(jam|hari|minggu|bulan)$/i);
  if (!start || !duration) return '';

  const count = Math.max(1, Number(duration[1]));
  const unit = duration[2].toLowerCase();
  const date = new Date(`${start}T12:00:00`);
  if (unit === 'hari') date.setDate(date.getDate() + count - 1);
  else if (unit === 'minggu') date.setDate(date.getDate() + count * 7 - 1);
  else if (unit === 'bulan') {
    date.setMonth(date.getMonth() + count);
    date.setDate(date.getDate() - 1);
  }
  // Durasi jam berarti event berakhir pada hari yang sama.
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const isEventVisibleToPublic = (event: TrainingProposal, today = new Date()): boolean => {
  const isPrivate = String(event.publishMode ?? '').toLowerCase() === 'private';
  if (!isPrivate) return !event.invitationToken;

  const endDate = getEndDate(event);
  if (!endDate) return false;

  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // Baru tampil sehari setelah tanggal berakhir terlewati.
  return todayYMD > endDate;
};

export const isEventFinished = (event: TrainingProposal, today = new Date()): boolean => {
  const endDate = getEndDate(event);
  if (!endDate) return false;
  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return todayYMD > endDate;
};
