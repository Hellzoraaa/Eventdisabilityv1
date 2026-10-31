// Status pendaftaran berdasarkan batas pendaftaran (event & pendidikan).
// Hari terakhir (batas pendaftaran) masih dihitung buka; mulai hari berikutnya sudah berakhir.

/** Tanggal hari ini di zona WIB (UTC+7), format YYYY-MM-DD. */
export const todayWIB = (): string =>
  new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** true bila batas pendaftaran terisi dan sudah lewat dari hari ini. */
export const isRegistrationDeadlinePassed = (batasPendaftaran?: string | null): boolean => {
  const d = String(batasPendaftaran || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d < todayWIB();
};
