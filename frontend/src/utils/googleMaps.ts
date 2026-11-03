/**
 * Utilitas link Google Maps -> koordinat.
 * Pengguna mengisi link Google Maps; latitude/longitude diambil otomatis dari link tersebut
 * (database tetap menyimpan latitude & longitude agar peta persebaran tetap berfungsi).
 */
export interface MapsCoordinate {
  latitude: number;
  longitude: number;
}

const GOOGLE_HOSTS = /(^|\.)(google\.[a-z.]+|goo\.gl|g\.co)$/i;

const isValid = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) && Number.isFinite(longitude) &&
  latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

const pair = (lat: string, lng: string): MapsCoordinate | null => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return isValid(latitude, longitude) ? { latitude, longitude } : null;
};

const safeDecode = (value: string) => {
  try { return decodeURIComponent(value); } catch { return value; }
};

/** Mengubah koordinat menjadi link Google Maps (dipakai saat mengisi ulang form edit). */
export const coordinatesToMapsLink = (latitude: unknown, longitude: unknown): string => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return '';
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

/** Mengambil koordinat dari link Google Maps lengkap (tanpa akses jaringan). */
export const extractCoordinatesFromText = (input: string): MapsCoordinate | null => {
  const text = safeDecode(safeDecode(input.trim()));
  const num = '(-?\\d{1,3}(?:\\.\\d+)?)';
  const patterns: RegExp[] = [
    new RegExp(`!3d${num}!4d${num}`),                                   // pin tempat (paling akurat)
    new RegExp(`@${num},${num}`),                                       // pusat peta
    new RegExp(`[?&](?:q|query|ll|destination|daddr|center|sll)=\\s*${num}\\s*,\\s*${num}`),
    new RegExp(`/(?:place|search|dir)/[^/]*?${num}\\s*,\\s*\\+?${num}`),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const result = pair(match[1], match[2]);
      if (result) return result;
    }
  }
  return null;
};

const toUrl = (value: string): URL | null => {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch { return null; }
};

/**
 * Menerjemahkan isi kolom "Link Google Maps" menjadi koordinat.
 * - Link lengkap (google.com/maps/...) dibaca langsung.
 * - Link pendek (maps.app.goo.gl/...) diselesaikan lewat server.
 * - Format lama "latitude, longitude" tetap diterima.
 * Mengembalikan null jika link tidak valid / koordinat tidak ditemukan.
 */
export const resolveGoogleMapsLink = async (input: string): Promise<MapsCoordinate | null> => {
  const value = input.trim();
  if (!value) return null;

  const raw = value.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (raw) return pair(raw[1], raw[2]);

  const url = toUrl(value);
  if (!url || !GOOGLE_HOSTS.test(url.hostname)) return null;

  const direct = extractCoordinatesFromText(url.toString());
  if (direct) return direct;

  try {
    const res = await fetch(`/api/maps/resolve?url=${encodeURIComponent(url.toString())}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.url === 'string' ? extractCoordinatesFromText(data.url) : null;
  } catch {
    return null;
  }
};

export const MAPS_LINK_ERROR =
  'Link Google Maps tidak valid atau koordinat tidak ditemukan. Buka lokasi di Google Maps, klik Bagikan, lalu salin linknya.';
export const MAPS_LINK_PLACEHOLDER = 'https://maps.app.goo.gl/xxxx atau https://www.google.com/maps/place/...';
export const MAPS_LINK_HELP = 'Buka lokasi di Google Maps → Bagikan → Salin link, lalu tempel di sini.';
