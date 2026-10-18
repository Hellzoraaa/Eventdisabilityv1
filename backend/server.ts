import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import type {
  User,
  TrainingProposal,
  TPQProgram,
  Participant,
  QuranCommunity,
  SystemStats,
  DisabilityMaster,
  EventCategory,
  ApplicationSettings,
  SystemLog
} from '../frontend/src/types.ts';
import { getDbPool } from './database/mysql.ts';
import { sendWaLinkEmail, isRealEmail } from './mailer.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Autentikasi per-browser menggunakan cookie bertanda tangan (tanpa dependency tambahan).
// Untuk produksi, atur SESSION_SECRET di environment agar secret stabil dan kuat.
const SESSION_COOKIE = 'efd_session';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function signSessionValue(userId: string): string {
  const payload = Buffer.from(userId, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readSessionUserId(req: express.Request): string | null {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;

  const value = cookie.slice(SESSION_COOKIE.length + 1);
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return null;

  const payload = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

  try {
    const userId = Buffer.from(payload, 'base64url').toString('utf8');
    return userId || null;
  } catch {
    return null;
  }
}

function setSessionCookie(res: express.Response, userId: string): void {
  const value = signSessionValue(userId);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
}

function clearSessionCookie(res: express.Response): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}


// ======================== API ROUTES ========================

function jsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

function mapDbUser(row: any): User {
  return {
    id: String(row.user_id_string || row.id || ''),
    name: row.name ?? '',
    email: row.email ?? '',
    role: row.role === 'superadmin' ? 'superadmin' : 'mitra',
    phone: row.phone ?? '',
    organizationName: row.organizationName ?? row.organization_name ?? undefined,
    organizationLogo: row.organizationLogo ?? row.organization_logo ?? undefined,
    isVerified: row.is_verified != null ? Boolean(row.is_verified) : true,
    province: row.province ?? undefined,
    city: row.city ?? undefined,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    avatar: row.avatar ?? undefined,
  };
}

function mapDbDisability(row: any): DisabilityMaster {
  return {
    id: String(row.disability_id_string ?? row.id),
    kode: row.kode ?? '',
    nama: row.nama ?? '',
    kategoriUtama: row.kategori_utama ?? '',
    deskripsi: row.deskripsi ?? '',
    metodePembelajaran: row.metode_pembelajaran ?? '',
    fasilitasRekomendasi: jsonParse<string[]>(row.fasilitas_rekomendasi, []),
    warnaHex: row.warna_hex ?? '#005a71',
    icon: row.icon ?? 'accessible',
    isAktif: Boolean(Number(row.is_aktif)),
    izinkanPublikasi: Boolean(Number(row.izinkan_publikasi)),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapDbEventCategory(row: any): EventCategory {
  return {
    id: String(row.category_id_string ?? row.id),
    kode: row.kode ?? '',
    nama: row.nama ?? '',
    deskripsi: row.deskripsi ?? '',
    icon: row.icon ?? 'category',
    warnaHex: row.warna_hex ?? '#0284c7',
    isAktif: Boolean(row.is_aktif),
    urutan: Number(row.urutan ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapDbCommunity(row: any): QuranCommunity {
  return {
    id: String(row.community_id_string ?? row.id),
    namaLembaga: row.nama_lembaga ?? '',
    kategoriDisabilitas: jsonParse<string[]>(row.kategori_disabilitas, []),
    provinsi: row.provinsi ?? '',
    kota: row.kota ?? '',
    alamatLengkap: row.alamat_lengkap ?? '',
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    kontakWa: row.kontak_wa ?? '',
    kontakEmail: row.kontak_email ?? '',
    jumlahSantri: Number(row.jumlah_santri ?? 0),
    fasilitasTersedia: jsonParse<string[]>(row.fasilitas_tersedia, []),
    programUnggulan: row.program_unggulan ?? '',
    deskripsi: row.deskripsi ?? '',
    verified: Boolean(row.is_verified),
    activeEventsCount: Number(row.activeEventsCount ?? 0),
    logo: row.logo || row.user_org_logo || row.organization_logo || undefined,
  };
}


function mapDbTPQ(row: any): TPQProgram {
  return {
    id: String(row.program_id_string ?? row.id),
    mitraId: String(row.mitra_id_string ?? row.mitra_id ?? ''),
    mitraName: row.mitraName ?? row.name ?? '',
    mitraOrg: row.mitraOrg ?? row.organization_name ?? '',
    // Logo lembaga mitra penyelenggara (users.organization_logo), dipakai di kartu & halaman TPQ.
    mitraLogo: row.userOrgLogo ?? row.organization_logo ?? undefined,
    namaProgram: row.nama_program ?? '',
    jenisTPQ: row.jenis_tpq === 'braille' ? 'braille' : 'isyarat',
    deskripsiProgram: row.deskripsi_program ?? '',
    tujuanPembelajaran: row.tujuan_pembelajaran ?? '',
    targetPeserta: row.target_peserta ?? '',
    kuotaPeserta: Number(row.kuota_peserta ?? 0),
    materiPembelajaran: row.materi_pembelajaran ?? '',
    metodePembelajaran: row.metode_pembelajaran ?? '',
    kebutuhanFasilitas: jsonParse<string[]>(row.kebutuhan_fasilitas, []),
    frekuensiPertemuan: row.frekuensi_pertemuan ?? '',
    durasiProgram: row.durasi_program ?? '',
    fotoDokumentasi: jsonParse<string[]>(row.foto_dokumentasi, []),
    linkGrupWa: row.link_grup_wa ?? '',
    hariPertemuan: jsonParse<string[]>(row.hari_pertemuan, []),
    jamMulai: row.jam_mulai ? String(row.jam_mulai).slice(0, 5) : null,
    jamSelesai: row.jam_selesai ? String(row.jam_selesai).slice(0, 5) : null,
    // DATE dari mysql2 bisa berupa objek Date; jangan gunakan String(date).slice()
    // karena hasil seperti 'Thu Oct 15' akan diparse browser sebagai tahun 2001.
    tanggalMulai: dateOnly(row.tanggal_mulai) || null,
    tanggalSelesai: dateOnly(row.tanggal_selesai) || null,
    batasPendaftaran: dateOnly(row.batas_pendaftaran) || null,
    benefitProgram: row.benefit_program ?? '',
    provinsi: row.provinsi ?? '',
    kota: row.kota ?? '',
    lokasiDanAlamat: row.lokasi_dan_alamat ?? '',
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    status: row.status ?? 'menunggu_persetujuan',
    alasanPenolakan: row.alasan_penolakan ?? undefined,
    isAktif: Boolean(Number(row.is_aktif)),
    izinkanPublikasi: Boolean(Number(row.izinkan_publikasi)),
    jumlahPendaftar: Number(row.jumlah_pendaftar ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

// MySQL DATE columns may arrive as JavaScript Date objects. String(date).slice(0, 10)
// produces values such as 'Tue Oct 13', which are not valid YYYY-MM-DD dates.
function dateOnly(value: any): string {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Use UTC parts because mysql2 commonly materializes DATE values at UTC midnight.
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function normalizeEventDateAndTime(row: any) {
  const rawDate = dateOnly(row.tanggal_kegiatan ?? '');
  const legacy = rawDate.match(/^(\d{4}-\d{2}-\d{2})\s*\((\d{1,2}:\d{2})(?::\d{2})?\s*-\s*(\d{1,2}:\d{2})(?::\d{2})?\)$/);
  const date = legacy ? legacy[1] : rawDate;
  const start = row.waktu_mulai ?? row.waktuMulai ?? row.jamMulai ?? (legacy ? legacy[2] : null);
  const end = row.waktu_selesai ?? row.waktuSelesai ?? row.jamSelesai ?? (legacy ? legacy[3] : null);
  const toHHmm = (value: any) => value == null || value === '' ? '' : String(value).slice(0, 5);
  return { date, start: toHHmm(start), end: toHHmm(end) };
}

function mapDbEvent(row: any): TrainingProposal {
  const schedule = normalizeEventDateAndTime(row);
  return ({
    id: String(row.proposal_id_string ?? row.id),
    mitraId: row.mitra_id_string ?? undefined,
    mitraName: row.mitraName ?? undefined,
    mitraOrg: row.mitraOrg ?? row.mitra_org ?? '',
    namaKegiatan: row.nama_kegiatan ?? '',
    jenisEvent: row.jenis_event ?? '',
    deskripsiPelatihan: row.deskripsi_pelatihan ?? '',
    benefit: row.benefit ?? '',
    persyaratan: row.persyaratan ?? '',
    batasPendaftaran: dateOnly(row.batas_pendaftaran),
    lokasiDanAlamat: row.lokasi_dan_alamat ?? '',
    provinsi: row.provinsi ?? '',
    kota: row.kota ?? '',
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    tanggalKegiatan: schedule.date,
    waktuMulai: schedule.start,
    waktuSelesai: schedule.end,
    jamMulai: schedule.start,
    jamSelesai: schedule.end,
    targetDanKuotaPeserta: Number(row.target_dan_kuota_peserta ?? 0),
    kuotaDisetujui: row.kuota_disetujui == null ? undefined : Number(row.kuota_disetujui),
    kebutuhanPeserta: jsonParse<string[]>(row.kebutuhan_peserta, []),
    status: row.status ?? 'menunggu_persetujuan',
    alasanPenolakan: row.alasan_penolakan ?? undefined,
    tanggalPersetujuan: row.tanggal_persetujuan ? new Date(row.tanggal_persetujuan).toISOString() : undefined,
    linkPendaftaran: row.link_pendaftaran ?? undefined,
    isAktif: Boolean(row.is_aktif),
    jumlahPendaftar: Number(row.jumlah_pendaftar ?? 0),
    mitraLogo: row.mitra_logo ?? row.mitraLogo ?? row.userOrgLogo ?? undefined,
    logoUrl: row.logo_url ?? row.logoUrl ?? row.mitra_logo ?? row.mitraLogo ?? row.userOrgLogo ?? undefined,
    isVerified: row.is_verified != null ? Boolean(row.is_verified) : true,
    isMitraResmi: row.is_mitra_resmi != null ? Boolean(row.is_mitra_resmi) : true,
    batch: row.batch ?? 'Batch 1',
    metodeBelajar: row.metode_belajar ?? (row.lokasi_dan_alamat && row.lokasi_dan_alamat.toLowerCase().includes('online') ? 'Daring (Online)' : 'Tatap Muka & Mandiri'),
    alurSeleksi: row.alur_seleksi ?? 'Seleksi Berkas & Verifikasi Khusus',
    kategoriDisabilitasUtama: row.kategori_disabilitas_utama ?? (
      (row.nama_kegiatan && (row.nama_kegiatan.toLowerCase().includes('braille') || row.nama_kegiatan.toLowerCase().includes('netra'))) ? 'Tunanetra' :
      (row.nama_kegiatan && (row.nama_kegiatan.toLowerCase().includes('isyarat') || row.nama_kegiatan.toLowerCase().includes('tuli') || row.nama_kegiatan.toLowerCase().includes('rungu'))) ? 'Tunarungu' :
      (row.nama_kegiatan && (row.nama_kegiatan.toLowerCase().includes('umum') || row.nama_kegiatan.toLowerCase().includes('non-disabilitas') || row.nama_kegiatan.toLowerCase().includes('pengajar'))) ? 'Umum / Non-Disabilitas' :
      (row.nama_kegiatan && row.nama_kegiatan.toLowerCase().includes('daksa')) ? 'Umum / Non-Disabilitas' :
      (row.nama_kegiatan && row.nama_kegiatan.toLowerCase().includes('autis')) ? 'Umum / Non-Disabilitas' : 'Umum / Non-Disabilitas'
    ),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    fotoDokumentasi: jsonParse<string[]>(row.foto_dokumentasi, []),
    eventCategoryId: row.event_category_id_string ?? undefined,
    disabilityId: row.disability_id_string ?? undefined,
  } as TrainingProposal);
}

function mapDbParticipant(row: any): Participant {
  return {
    id: String(row.participant_id_string ?? row.id),
    eventId: row.event_id_string ?? '',
    eventTitle: row.eventTitle ?? '',
    namaLengkap: row.nama_lengkap ?? '',
    noWa: row.no_wa ?? '',
    email: row.email ?? '',
    usia: Number(row.usia ?? 0),
    kategoriDisabilitas: row.kategori_disabilitas ?? '',
    kebutuhanFasilitas: jsonParse<string[]>(row.kebutuhan_fasilitas, []),
    catatanKhusus: row.catatan_khusus ?? '',
    statusKehadiran: row.status_kehadiran ?? 'terdaftar',
    waktuDaftar: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

async function getPool() {
  const pool = await getDbPool();
  if (!pool) throw new Error('Database MySQL tidak tersedia.');
  return pool;
}

/**
 * Memastikan setiap akun Mitra mempunyai 1 record di quran_communities.
 *
 * Homepage membaca daftar Mitra dari quran_communities, bukan langsung dari users.
 * Karena itu users dan quran_communities harus selalu disinkronkan.
 */
async function ensureMitraCommunity(userIdString: string) {
  const pool = await getPool();
  const [userRows] = await pool.query(
    `SELECT id, user_id_string, name, email, phone, role,
            organization_name, organization_logo, province, city, address
       FROM users
      WHERE user_id_string = ?
      LIMIT 1`,
    [userIdString]
  );

  const user = Array.isArray(userRows) ? (userRows as any[])[0] : null;
  if (!user) throw new Error('Pengguna tidak ditemukan.');
  if (String(user.role) !== 'mitra') return null;

  const numericUserId = Number(user.id);
  const namaLembaga = String(user.organization_name || user.name || '').trim();
  const provinsi = String(user.province || '').trim();
  const kota = String(user.city || '').trim();
  const alamat = String(user.address || '').trim() || [kota, provinsi].filter(Boolean).join(', ');
  const kontakWa = String(user.phone || '').trim();
  const kontakEmail = String(user.email || '').trim().toLowerCase();
  const logo = user.organization_logo ? String(user.organization_logo) : null;

  if (!namaLembaga) {
    throw new Error('Nama lembaga mitra belum tersedia.');
  }

  const [existingRows] = await pool.query(
    `SELECT id, community_id_string
       FROM quran_communities
      WHERE user_id = ? OR nama_lembaga = ?
      ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, id ASC
      LIMIT 1`,
    [numericUserId, namaLembaga, numericUserId]
  );

  const existing = Array.isArray(existingRows) ? (existingRows as any[])[0] : null;

  if (existing) {
    await pool.query(
      `UPDATE quran_communities
          SET user_id = ?,
              nama_lembaga = ?,
              provinsi = ?,
              kota = ?,
              alamat_lengkap = ?,
              kontak_wa = ?,
              kontak_email = ?,
              logo = ?,
              is_verified = TRUE,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        numericUserId,
        namaLembaga,
        provinsi,
        kota,
        alamat,
        kontakWa,
        kontakEmail || null,
        logo,
        existing.id,
      ]
    );

    return String(existing.community_id_string || existing.id);
  }

  const communityId = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await pool.query(
    `INSERT INTO quran_communities
      (community_id_string, user_id, nama_lembaga, kategori_disabilitas,
       provinsi, kota, alamat_lengkap, latitude, longitude, kontak_wa,
       kontak_email, jumlah_santri, fasilitas_tersedia, program_unggulan,
       deskripsi, logo, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      communityId,
      numericUserId,
      namaLembaga,
      JSON.stringify([]),
      provinsi,
      kota,
      alamat,
      0,
      0,
      kontakWa,
      kontakEmail || null,
      0,
      JSON.stringify([]),
      '',
      `Mitra resmi ${namaLembaga}`,
      logo,
    ]
  );

  return communityId;
}

/**
 * Backfill untuk akun Mitra lama yang sudah ada di users tetapi belum mempunyai
 * record quran_communities. Aman dijalankan berulang kali karena helper di atas
 * akan memperbarui record yang sudah ada dan hanya membuat yang belum ada.
 */
async function syncAllMitraCommunities() {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT user_id_string
         FROM users
        WHERE role = 'mitra'
        ORDER BY id ASC`
    );

    let synced = 0;
    for (const row of rows as any[]) {
      try {
        await ensureMitraCommunity(String(row.user_id_string));
        synced++;
      } catch (error) {
        console.warn(
          `[Mitra Sync] Gagal sinkronisasi ${row.user_id_string}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log(`[Mitra Sync] ${synced}/${Array.isArray(rows) ? rows.length : 0} akun Mitra tersinkronisasi ke quran_communities.`);
  } catch (error) {
    console.error('[Mitra Sync] Gagal melakukan sinkronisasi Mitra:', error);
  }
}

async function addSystemLog(user: string, userRole: string, action: string, module: string, details: string, status: SystemLog['status'] = 'info') {
  try {
    const pool = await getPool();
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO system_logs
        (log_id_string, user, user_role, action, module, details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, user || 'Sistem', userRole || 'system', action, module, details, status]
    );
  } catch (error) {
    console.error('[System Log] error:', error);
  }
}

async function getUserById(userId: string) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT user_id_string AS id, name, email, role, phone,
            organization_name AS organizationName, organization_logo AS organizationLogo, province, city, address, avatar,
            created_at AS createdAt
     FROM users WHERE user_id_string = ? OR id = ? LIMIT 1`,
    [userId, Number(userId) || 0]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return mapDbUser(rows[0]);
}

// ======================== AUTH ========================

app.get('/api/auth/current', async (req, res) => {
  try {
    const sessionUserId = readSessionUserId(req);
    if (!sessionUserId) return res.json({ user: null });
    const user = await getUserById(sessionUserId);
    if (!user) clearSessionCookie(res);
    return res.json({ user: user || null });
  } catch (error) {
    console.error('[Auth Current] error:', error);
    return res.status(500).json({ error: 'Gagal membaca sesi pengguna dari MySQL.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT user_id_string AS id, name, email, password, role, phone,
              organization_name AS organizationName, organization_logo AS organizationLogo, province, city, address, avatar,
              created_at AS createdAt
       FROM users WHERE LOWER(email) = ? LIMIT 1`,
      [email]
    );
    if (!Array.isArray(rows) || rows.length === 0) return res.status(401).json({ error: 'Akun dengan email tersebut tidak ditemukan.' });

    const dbUser = rows[0] as any;
    if (!dbUser.password || !(await bcrypt.compare(password, dbUser.password))) {
      return res.status(401).json({ error: 'Kata sandi tidak valid. Periksa kembali kata sandi Anda.' });
    }

    setSessionCookie(res, String(dbUser.id));
    const { password: _password, ...safeUser } = dbUser;
    await addSystemLog(dbUser.name, dbUser.role, 'Login', 'auth', `Pengguna ${dbUser.email} berhasil login.`, 'success');
    return res.json({ success: true, user: safeUser, message: `Selamat datang kembali, ${dbUser.name}` });
  } catch (error) {
    console.error('[Auth Login] error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat proses login.' });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, confirmPassword } = req.body ?? {};
    if (!userId) return res.status(400).json({ error: 'User ID wajib disertakan.' });
    if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: 'Kata sandi baru minimal harus terdiri dari 6 karakter.' });
    if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Konfirmasi kata sandi baru tidak sesuai.' });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT user_id_string AS id, name, role, password FROM users WHERE user_id_string = ? LIMIT 1`,
      [String(userId)]
    );
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const target = rows[0] as any;
    if (!currentPassword || !(await bcrypt.compare(currentPassword, target.password))) {
      return res.status(400).json({ error: 'Kata sandi saat ini tidak cocok.' });
    }

    const newHash = await bcrypt.hash(String(newPassword), 12);
    await pool.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id_string = ?', [newHash, String(userId)]);
    await addSystemLog(target.name, target.role, 'Perubahan Password', 'auth', `Password pengguna ${target.name} diperbarui.`, 'success');
    return res.json({ success: true, message: `Kata sandi untuk ${target.name} berhasil diperbarui.` });
  } catch (error) {
    console.error('[Auth Change Password] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kata sandi.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true, message: 'Berhasil keluar dari sesi.' });
});

app.post('/api/auth/switch', (_req, res) => {
  // Endpoint lama memungkinkan pergantian akun hanya dengan mengirim userId.
  // Nonaktifkan agar pengguna tidak dapat menyamar sebagai akun lain.
  return res.status(403).json({ error: 'Pergantian akun melalui endpoint ini dinonaktifkan. Silakan login kembali.' });
});

// ======================== USERS ========================

app.get('/api/users', async (req, res) => {
  try {
    const pool = await getPool();
    const role = typeof req.query.role === 'string' ? req.query.role : '';
    const params: string[] = [];
    let sql = `SELECT user_id_string AS id, name, email, role, phone,
                      organization_name AS organizationName, organization_logo AS organizationLogo, province, city, address, avatar,
                      created_at AS createdAt
               FROM users`;
    if (role === 'superadmin' || role === 'mitra') {
      sql += ' WHERE role = ?';
      params.push(role);
    }
    sql += ' ORDER BY created_at DESC, id DESC';
    const [rows] = await pool.query(sql, params);
    return res.json({ users: Array.isArray(rows) ? rows.map(mapDbUser) : [] });
  } catch (error) {
    console.error('[Users GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data pengguna dari MySQL.' });
  }
});

async function createUserAccount(req: express.Request, res: express.Response, role: User['role']) {
  try {
    const {
      name,
      email,
      phone,
      organizationName,
      organizationLogo,
      province,
      city,
      address,
    } = req.body ?? {};

    if (!name || !email) {
      return res.status(400).json({ error: 'Nama dan Email wajib diisi.' });
    }

    if (role === 'mitra' && !organizationName) {
      return res.status(400).json({ error: 'Nama lembaga mitra wajib diisi.' });
    }

    const pool = await getPool();
    const cleanEmail = String(email).trim().toLowerCase();

    const [existing] = await pool.query(
      'SELECT user_id_string FROM users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );

    if (Array.isArray(existing) && existing.length) {
      return res.status(409).json({ error: 'Email sudah terdaftar dalam sistem.' });
    }

    const id = `usr_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const hash = await bcrypt.hash('password123', 12);

    await pool.query(
      `INSERT INTO users
        (user_id_string, name, email, password, role, phone,
         organization_name, organization_logo, province, city, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(name).trim(),
        cleanEmail,
        hash,
        role,
        phone ? String(phone).trim() : null,
        organizationName ? String(organizationName).trim() : null,
        organizationLogo ? String(organizationLogo) : null,
        province ? String(province).trim() : null,
        city ? String(city).trim() : null,
        address ? String(address).trim() : null,
      ]
    );

    // Sangat penting: akun Mitra harus mempunyai record quran_communities
    // agar langsung muncul pada Homepage Mitra.
    if (role === 'mitra') {
      await ensureMitraCommunity(id);
    }

    const user = await getUserById(id);

    await addSystemLog(
      'Super Administrator',
      'superadmin',
      'Tambah Pengguna',
      'system',
      `Akun ${user?.name ?? name} dibuat${role === 'mitra' ? ' dan profil Mitra Homepage disinkronkan' : ''}.`,
      'success'
    );

    return res.status(201).json({
      success: true,
      user,
      initialPassword: 'password123',
      message:
        role === 'mitra'
          ? 'Akun Mitra berhasil dibuat, profil Homepage berhasil dibuat, dan password awal adalah password123.'
          : 'Akun berhasil dibuat. Password awal: password123.',
    });
  } catch (error) {
    console.error('[Users POST] error:', error);
    return res.status(500).json({
      error: 'Gagal membuat akun pengguna di MySQL.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

app.post('/api/users/superadmin', (req, res) => createUserAccount(req, res, 'superadmin'));
app.post('/api/users/mitra', (req, res) => createUserAccount(req, res, 'mitra'));

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const current = await getUserById(id);
    if (!current) return res.status(404).json({ error: 'User tidak ditemukan di MySQL.' });

    const body = req.body ?? {};
    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : current.email;
    const role = body.role === 'superadmin' || body.role === 'mitra' ? body.role : current.role;

    if (email && email.toLowerCase() !== (current.email || '').toLowerCase()) {
      const [dupe] = await pool.query(
        'SELECT user_id_string FROM users WHERE LOWER(email) = ? AND user_id_string <> ? LIMIT 1',
        [email, id]
      );
      if (Array.isArray(dupe) && dupe.length) return res.status(409).json({ error: 'Email sudah digunakan oleh pengguna lain.' });
    }

    const newOrgLogo = body.organizationLogo !== undefined ? body.organizationLogo : current.organizationLogo || null;

    await pool.query(
      `UPDATE users SET name=?, email=?, phone=?, organization_name=?, organization_logo=?, province=?, city=?, role=?, avatar=?, updated_at=CURRENT_TIMESTAMP
       WHERE user_id_string=?`,
      [
        body.name !== undefined ? String(body.name).trim() : current.name,
        email,
        body.phone !== undefined ? String(body.phone).trim() : current.phone || null,
        body.organizationName !== undefined ? String(body.organizationName).trim() : current.organizationName || null,
        newOrgLogo,
        body.province !== undefined ? String(body.province).trim() : current.province || null,
        body.city !== undefined ? String(body.city).trim() : current.city || null,
        role,
        body.avatar !== undefined ? body.avatar : current.avatar || null,
        id
      ]
    );

    // Sinkronkan profil Mitra ke quran_communities setelah perubahan user.
    // Ini mencakup nama lembaga, lokasi, kontak, dan logo.
    if (role === 'mitra') {
      try {
        await ensureMitraCommunity(id);
      } catch (err) {
        console.warn('[Mitra Sync] Sinkronisasi setelah update user gagal:', err);
      }
    }

    // Sinkronkan logo event lama jika logo Mitra berubah.
    if (body.organizationLogo !== undefined) {
      try {
        await pool.query(
          'UPDATE training_proposals SET mitra_logo = ? WHERE mitra_id_string = ? OR mitra_org = ?',
          [newOrgLogo || '', id, current.organizationName || '']
        );
      } catch (err) {
        console.warn('Non-fatal sync error for proposal mitra_logo:', err);
      }
    }

    const updated = await getUserById(id);
    await addSystemLog(updated?.name || current.name, updated?.role || current.role, 'Pembaruan Data Pengguna', 'system', `Data pengguna diperbarui di MySQL.`, 'success');
    return res.json({ success: true, user: updated });
  } catch (error) {
    console.error('[Users PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui pengguna di MySQL.' });
  }
});

// Dedicated endpoint for updating organization logo quickly
const handleUserLogoUpdate = async (req: express.Request, res: express.Response) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const current = await getUserById(id);
    if (!current) return res.status(404).json({ error: 'Pengguna tidak ditemukan di MySQL.' });

    const rawLogo = req.body?.organizationLogo;
    const newLogo = rawLogo !== undefined && rawLogo !== null ? String(rawLogo) : '';

    await pool.query(
      'UPDATE users SET organization_logo = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id_string = ?',
      [newLogo || null, id]
    );

    // Sync to training proposals
    try {
      await pool.query(
        'UPDATE training_proposals SET mitra_logo = ? WHERE mitra_id_string = ? OR mitra_org = ?',
        [newLogo, id, current.organizationName || '']
      );
    } catch (err) {
      console.warn('Non-fatal sync error for proposal mitra_logo:', err);
    }

    // Pastikan logo juga tercermin pada profil Mitra di Homepage.
    if (current.role === 'mitra') {
      try {
        await ensureMitraCommunity(id);
      } catch (err) {
        console.warn('[Mitra Sync] Sinkronisasi logo ke community gagal:', err);
      }
    }

    const updated = await getUserById(id);
    await addSystemLog(
      'Super Administrator',
      'superadmin',
      'Pembaruan Logo Mitra',
      'users',
      `Logo untuk mitra "${current.organizationName || current.name}" berhasil ${newLogo ? 'diunggah' : 'dihapus'}.`,
      'success'
    );

    return res.json({ success: true, user: updated, logo: newLogo });
  } catch (error) {
    console.error('[Users Logo PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui logo mitra di MySQL.' });
  }
};

app.put('/api/users/:id/logo', handleUserLogoUpdate);
app.patch('/api/users/:id/logo', handleUserLogoUpdate);

app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const target = await getUserById(id);
    if (!target) return res.status(404).json({ error: 'User tidak ditemukan di MySQL.' });

    if (target.role === 'superadmin') {
      const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users WHERE role='superadmin'`);
      const count = Number((countRows as any[])[0]?.total ?? 0);
      if (count <= 1) return res.status(400).json({ error: 'Superadmin terakhir tidak boleh dihapus.' });
    }

    // Hapus profil Homepage Mitra yang dimiliki akun ini agar tidak menjadi orphan.
    if (target.role === 'mitra') {
      try {
        const [numericRows] = await pool.query(
          'SELECT id FROM users WHERE user_id_string = ? LIMIT 1',
          [id]
        );
        const numericId = Array.isArray(numericRows) ? Number((numericRows as any[])[0]?.id || 0) : 0;
        if (numericId) {
          await pool.query('DELETE FROM quran_communities WHERE user_id = ?', [numericId]);
        }
      } catch (err) {
        console.warn('[Mitra Delete] Gagal menghapus profil community:', err);
      }
    }

    await pool.query('DELETE FROM users WHERE user_id_string = ?', [id]);
    await addSystemLog('Super Administrator', 'superadmin', 'Penghapusan Pengguna', 'system', `Pengguna ${target.name} dihapus dari MySQL.`, 'warning');
    return res.json({ success: true, message: `Pengguna ${target.name} berhasil dihapus.` });
  } catch (error) {
    console.error('[Users DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus pengguna dari MySQL.' });
  }
});

// ======================== APPLICATION SETTINGS ========================

const DEFAULT_APP_SETTINGS: ApplicationSettings = {
  applicationName: 'Alquran Disabilitas',
  logo: '/logo-quran.svg',
  favicon: '/favicon.svg',
  topbarColor: '#005a71',
  primaryColor: '#005a71',
  secondaryColor: '#ab3425',
  accentColor: '#d97706',
  publicRoleLabel: 'Peserta',
  institutionSubtitle: 'Kementerian Agama Republik Indonesia',
  logoSize: 'large',
  headerBgImage: '',
  headerBgOverlay: 'dark',
  logoContainerBg: 'white',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Super Administrator',
};

function mapDbAppSettings(row: any): ApplicationSettings {
  return {
    applicationName: row.application_name ?? DEFAULT_APP_SETTINGS.applicationName,
    logo: row.logo ?? DEFAULT_APP_SETTINGS.logo,
    favicon: row.favicon ?? DEFAULT_APP_SETTINGS.favicon,
    topbarColor: row.topbar_color ?? DEFAULT_APP_SETTINGS.topbarColor,
    primaryColor: row.primary_color ?? DEFAULT_APP_SETTINGS.primaryColor,
    secondaryColor: row.secondary_color ?? DEFAULT_APP_SETTINGS.secondaryColor,
    accentColor: row.accent_color ?? DEFAULT_APP_SETTINGS.accentColor,
    publicRoleLabel: row.public_role_label ?? DEFAULT_APP_SETTINGS.publicRoleLabel,
    institutionSubtitle: row.institution_subtitle ?? DEFAULT_APP_SETTINGS.institutionSubtitle,
    logoSize: row.logo_size ?? DEFAULT_APP_SETTINGS.logoSize,
    headerBgImage: row.header_bg_image ?? DEFAULT_APP_SETTINGS.headerBgImage,
    headerBgOverlay: row.header_bg_overlay ?? DEFAULT_APP_SETTINGS.headerBgOverlay,
    logoContainerBg: row.logo_container_bg ?? DEFAULT_APP_SETTINGS.logoContainerBg,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : DEFAULT_APP_SETTINGS.updatedAt,
    updatedBy: row.updated_by ?? DEFAULT_APP_SETTINGS.updatedBy,
  };
}

app.get('/api/app-settings', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT application_name, logo, favicon, topbar_color, primary_color, secondary_color,
              accent_color, public_role_label, institution_subtitle, logo_size,
              header_bg_image, header_bg_overlay, logo_container_bg, updated_by, updated_at
       FROM application_settings WHERE setting_key='global_config' LIMIT 1`
    );
    const settings = Array.isArray(rows) && rows.length ? mapDbAppSettings(rows[0]) : DEFAULT_APP_SETTINGS;
    return res.json({ settings });
  } catch (error) {
    console.error('[App Settings GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil Application Settings dari MySQL.' });
  }
});

app.post('/api/app-settings', async (req, res) => {
  try {
    const body = req.body ?? {};
    const applicationName = String(body.applicationName ?? '').trim();
    if (!applicationName) return res.status(400).json({ error: 'Nama aplikasi wajib diisi.' });

    const pool = await getPool();
    const values = [
      applicationName,
      body.logo ?? DEFAULT_APP_SETTINGS.logo,
      body.favicon ?? DEFAULT_APP_SETTINGS.favicon,
      body.topbarColor ?? DEFAULT_APP_SETTINGS.topbarColor,
      body.primaryColor ?? DEFAULT_APP_SETTINGS.primaryColor,
      body.secondaryColor ?? DEFAULT_APP_SETTINGS.secondaryColor,
      body.accentColor ?? DEFAULT_APP_SETTINGS.accentColor,
      body.publicRoleLabel ?? DEFAULT_APP_SETTINGS.publicRoleLabel,
      body.institutionSubtitle ?? DEFAULT_APP_SETTINGS.institutionSubtitle,
      body.logoSize ?? DEFAULT_APP_SETTINGS.logoSize,
      body.headerBgImage ?? '',
      body.headerBgOverlay ?? DEFAULT_APP_SETTINGS.headerBgOverlay,
      body.logoContainerBg ?? DEFAULT_APP_SETTINGS.logoContainerBg,
      body.updatedBy ?? 'Super Administrator',
    ];

    await pool.query(
      `INSERT INTO application_settings
        (setting_key, application_name, logo, favicon, topbar_color, primary_color, secondary_color,
         accent_color, public_role_label, institution_subtitle, logo_size, header_bg_image,
         header_bg_overlay, logo_container_bg, updated_by)
       VALUES ('global_config', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        application_name=VALUES(application_name), logo=VALUES(logo), favicon=VALUES(favicon),
        topbar_color=VALUES(topbar_color), primary_color=VALUES(primary_color),
        secondary_color=VALUES(secondary_color), accent_color=VALUES(accent_color),
        public_role_label=VALUES(public_role_label), institution_subtitle=VALUES(institution_subtitle),
        logo_size=VALUES(logo_size), header_bg_image=VALUES(header_bg_image),
        header_bg_overlay=VALUES(header_bg_overlay), logo_container_bg=VALUES(logo_container_bg),
        updated_by=VALUES(updated_by), updated_at=CURRENT_TIMESTAMP`,
      values
    );

    const [rows] = await pool.query(
      `SELECT application_name, logo, favicon, topbar_color, primary_color, secondary_color,
              accent_color, public_role_label, institution_subtitle, logo_size,
              header_bg_image, header_bg_overlay, logo_container_bg, updated_by, updated_at
       FROM application_settings WHERE setting_key='global_config' LIMIT 1`
    );
    const settings = Array.isArray(rows) && rows.length ? mapDbAppSettings(rows[0]) : DEFAULT_APP_SETTINGS;
    await addSystemLog(String(body.updatedBy || 'Super Administrator'), 'superadmin', 'Pembaruan Application Setting', 'settings', `Pengaturan aplikasi disimpan ke MySQL: ${applicationName}.`, 'success');
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('[App Settings POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan Application Settings ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

// ======================== LOGS ========================

app.get('/api/logs', async (req, res) => {
  try {
    const pool = await getPool();
    const module = typeof req.query.module === 'string' ? req.query.module : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const params: any[] = [];
    let sql = `SELECT log_id_string AS id, timestamp, user, user_role AS userRole, action, module, details, status FROM system_logs`;
    const where: string[] = [];
    if (module && module !== 'all') { where.push('module = ?'); params.push(module); }
    if (status && status !== 'all') { where.push('status = ?'); params.push(status); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    const [rows] = await pool.query(sql, params);
    return res.json({ logs: rows, total: Array.isArray(rows) ? rows.length : 0 });
  } catch (error) {
    console.error('[Logs GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil log dari MySQL.' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { user, userRole, action, module, details, status } = req.body ?? {};
    if (!action || !details) return res.status(400).json({ error: 'Action and details are required' });
    const pool = await getPool();
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO system_logs (log_id_string, user, user_role, action, module, details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, user || 'Pengguna', userRole || 'guest', action, module || 'system', details, status || 'info']
    );
    return res.status(201).json({ success: true, log: { id, timestamp: new Date().toISOString(), user, userRole, action, module, details, status } });
  } catch (error) {
    console.error('[Logs POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan log ke MySQL.' });
  }
});

app.delete('/api/logs', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query('DELETE FROM system_logs');
    return res.json({ success: true, message: 'Semua logs aktivitas berhasil dihapus.' });
  } catch (error) {
    console.error('[Logs DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus logs dari MySQL.' });
  }
});

app.delete('/api/logs/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM system_logs WHERE log_id_string = ?', [String(req.params.id)]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Log tidak ditemukan.' });
    return res.json({ success: true, message: 'Log berhasil dihapus.' });
  } catch (error) {
    console.error('[Logs DELETE ID] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus log dari MySQL.' });
  }
});

// ======================== EVENTS ========================

async function getEventById(id: string) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo
     FROM training_proposals tp
     LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string
     WHERE tp.proposal_id_string = ? LIMIT 1`,
    [id]
  );
  return Array.isArray(rows) && rows.length ? mapDbEvent(rows[0]) : null;
}

app.get('/api/events', async (req, res) => {
  try {
    const pool = await getPool();
    const { status, mitraId, activeOnly } = req.query;
    const params: any[] = [];
    const where: string[] = [];

    if (typeof status === 'string' && status !== 'all') { where.push('tp.status = ?'); params.push(status); }
    if (typeof mitraId === 'string' && mitraId) { where.push('tp.mitra_id_string = ?'); params.push(mitraId); }
    if (activeOnly === 'true') { where.push('tp.is_aktif = 1'); }

    let sql = `SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo
               FROM training_proposals tp
               LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY tp.created_at DESC, tp.id DESC';

    const [rows] = await pool.query(sql, params);
    return res.json({ events: Array.isArray(rows) ? rows.map(mapDbEvent) : [] });
  } catch (error) {
    console.error('[Events GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil event dari MySQL.' });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await getEventById(String(req.params.id));
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan.' });
    return res.json({ event, proposal: event });
  } catch (error) {
    console.error('[Event GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil event dari MySQL.' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const body = req.body ?? {};
    const required = ['namaKegiatan', 'jenisEvent', 'deskripsiPelatihan', 'lokasiDanAlamat', 'provinsi', 'kota', 'tanggalKegiatan', 'waktuMulai', 'waktuSelesai'];
    for (const key of required) {
      if (!body[key]) return res.status(400).json({ error: `${key} wajib diisi.` });
    }

    if (String(body.waktuSelesai) <= String(body.waktuMulai)) return res.status(400).json({ error: 'Jam selesai harus setelah jam mulai.' });
    const pool = await getPool();
    const proposalId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let mitraNumericId: number | null = null;
    let mitraIdString: string | null = body.mitraId ? String(body.mitraId) : null;
    if (mitraIdString) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE user_id_string = ? LIMIT 1', [mitraIdString]);
      if (Array.isArray(uRows) && uRows.length) mitraNumericId = Number((uRows as any[])[0].id);
      else return res.status(400).json({ error: 'Mitra tidak ditemukan di MySQL.' });
    }

    await pool.query(
      `INSERT INTO training_proposals
       (proposal_id_string, mitra_id, mitra_id_string, nama_kegiatan, jenis_event,
        event_category_id_string, disability_id_string, deskripsi_pelatihan, benefit, persyaratan, batas_pendaftaran,
        lokasi_dan_alamat, provinsi, kota, latitude, longitude, tanggal_kegiatan, waktu_mulai, waktu_selesai,
        target_dan_kuota_peserta, kuota_disetujui, kebutuhan_peserta, foto_dokumentasi, status,
        alasan_penolakan, tanggal_persetujuan, link_pendaftaran, is_aktif, jumlah_pendaftar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu_persetujuan', NULL, NULL, NULL, FALSE, 0)`,
      [
        proposalId,
        mitraNumericId,
        mitraIdString,
        body.namaKegiatan,
        body.jenisEvent,
        body.eventCategoryId ? String(body.eventCategoryId) : null,
        body.disabilityId ? String(body.disabilityId) : null,
        body.deskripsiPelatihan,
        body.benefit ?? null,
        body.persyaratan ?? null,
        body.batasPendaftaran || null,
        body.lokasiDanAlamat,
        body.provinsi,
        body.kota,
        body.latitude == null ? null : Number(body.latitude),
        body.longitude == null ? null : Number(body.longitude),
        String(body.tanggalKegiatan).split(' (')[0],
        body.waktuMulai || body.jamMulai || null,
        body.waktuSelesai || body.jamSelesai || null,
        Number(body.targetDanKuotaPeserta || 0),
        body.kuotaDisetujui == null ? null : Number(body.kuotaDisetujui),
        JSON.stringify(Array.isArray(body.kebutuhanPeserta) ? body.kebutuhanPeserta : []),
        JSON.stringify(Array.isArray(body.fotoDokumentasi) ? body.fotoDokumentasi : []),
      ]
    );

    const event = await getEventById(proposalId);
    await addSystemLog('Pengguna', 'system', 'Tambah Event', 'events', `Event ${body.namaKegiatan} dibuat di MySQL.`, 'success');
    return res.status(201).json({ success: true, proposal: event, event });
  } catch (error) {
    console.error('[Events POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan event ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const current = await getEventById(id);
    if (!current) return res.status(404).json({ error: 'Event tidak ditemukan.' });
    const body = req.body ?? {};
    const pool = await getPool();

    let mitraNumericId: number | null = null;
    let mitraIdString = body.mitraId !== undefined ? (body.mitraId ? String(body.mitraId) : null) : (current.mitraId ?? null);
    if (mitraIdString) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE user_id_string = ? LIMIT 1', [mitraIdString]);
      if (!Array.isArray(uRows) || !uRows.length) return res.status(400).json({ error: 'Mitra tidak ditemukan di MySQL.' });
      mitraNumericId = Number((uRows as any[])[0].id);
    }

    const nextStart = body.waktuMulai ?? body.jamMulai ?? current.waktuMulai;
    const nextEnd = body.waktuSelesai ?? body.jamSelesai ?? current.waktuSelesai;
    if (nextStart && nextEnd && String(nextEnd).slice(0, 5) <= String(nextStart).slice(0, 5)) return res.status(400).json({ error: 'Jam selesai harus setelah jam mulai.' });
    const newStatus = ['menunggu_persetujuan', 'disetujui', 'ditolak'].includes(body.status) ? body.status : current.status;
    const foto = body.fotoDokumentasi !== undefined ? (Array.isArray(body.fotoDokumentasi) ? body.fotoDokumentasi : [body.fotoDokumentasi]) : current.fotoDokumentasi;

    await pool.query(
      `UPDATE training_proposals SET
        mitra_id=?, mitra_id_string=?, nama_kegiatan=?, jenis_event=?,
        event_category_id_string=?, disability_id_string=?, deskripsi_pelatihan=?, benefit=?, persyaratan=?, batas_pendaftaran=?,
        lokasi_dan_alamat=?, provinsi=?, kota=?, latitude=?, longitude=?, tanggal_kegiatan=?, waktu_mulai=?, waktu_selesai=?,
        target_dan_kuota_peserta=?, kuota_disetujui=?, kebutuhan_peserta=?, foto_dokumentasi=?, status=?,
        alasan_penolakan=?, link_pendaftaran=?, is_aktif=?, updated_at=CURRENT_TIMESTAMP
       WHERE proposal_id_string=?`,
      [
        mitraNumericId,
        mitraIdString,
        body.namaKegiatan ?? current.namaKegiatan,
        body.jenisEvent ?? current.jenisEvent,
        body.eventCategoryId !== undefined
          ? (body.eventCategoryId ? String(body.eventCategoryId) : null)
          : (current as any).eventCategoryId ?? null,
        body.disabilityId !== undefined
          ? (body.disabilityId ? String(body.disabilityId) : null)
          : (current as any).disabilityId ?? null,
        body.deskripsiPelatihan ?? current.deskripsiPelatihan,
        body.benefit !== undefined ? (body.benefit || null) : ((current as any).benefit || null),
        body.persyaratan !== undefined ? (body.persyaratan || null) : ((current as any).persyaratan || null),
        body.batasPendaftaran !== undefined ? (body.batasPendaftaran || null) : ((current as any).batasPendaftaran || null),
        body.lokasiDanAlamat ?? current.lokasiDanAlamat,
        body.provinsi ?? current.provinsi,
        body.kota ?? current.kota,
        body.latitude !== undefined ? Number(body.latitude) : current.latitude ?? null,
        body.longitude !== undefined ? Number(body.longitude) : current.longitude ?? null,
        String(body.tanggalKegiatan ?? current.tanggalKegiatan).split(' (')[0],
        body.waktuMulai ?? body.jamMulai ?? current.waktuMulai ?? null,
        body.waktuSelesai ?? body.jamSelesai ?? current.waktuSelesai ?? null,
        body.targetDanKuotaPeserta !== undefined ? Number(body.targetDanKuotaPeserta) : current.targetDanKuotaPeserta,
        body.kuotaDisetujui !== undefined ? Number(body.kuotaDisetujui) : current.kuotaDisetujui ?? null,
        JSON.stringify(body.kebutuhanPeserta !== undefined ? body.kebutuhanPeserta : current.kebutuhanPeserta),
        JSON.stringify(foto),
        newStatus,
        newStatus === 'ditolak' ? (body.alasanPenolakan ?? current.alasanPenolakan ?? null) : null,
        body.linkPendaftaran !== undefined ? body.linkPendaftaran : current.linkPendaftaran ?? null,
        body.isAktif !== undefined ? Boolean(body.isAktif) : current.isAktif,
        id
      ]
    );

    const event = await getEventById(id);
    return res.json({ success: true, proposal: event, event });
  } catch (error) {
    console.error('[Events PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui event di MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const event = await getEventById(id);
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan.' });

    const [result] = await pool.query('DELETE FROM training_proposals WHERE proposal_id_string = ?', [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Event tidak ditemukan.' });
    return res.json({ success: true, message: `Event "${event.namaKegiatan}" berhasil dihapus`, eventId: id });
  } catch (error) {
    console.error('[Events DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus event dari MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/events/:id/approve', async (req, res) => {
  try {
    const id = String(req.params.id);
    const event = await getEventById(id);
    if (!event) return res.status(404).json({ error: 'Permintaan pelatihan tidak ditemukan.' });

    const quota = Number(req.body?.targetKuota || event.targetDanKuotaPeserta);
    const origin = req.protocol + '://' + req.get('host');
    const link = `${origin}/#daftar/${id}`;
    const pool = await getPool();

    await pool.query(
      `UPDATE training_proposals
       SET status='disetujui', kuota_disetujui=?, link_pendaftaran=?,
           tanggal_persetujuan=CURRENT_TIMESTAMP, is_aktif=TRUE,
           alasan_penolakan=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE proposal_id_string=?`,
      [quota, link, id]
    );
    const updated = await getEventById(id);
    await addSystemLog('Super Administrator', 'superadmin', 'Verifikasi Event Pelatihan', 'events', `Event ${updated?.namaKegiatan ?? id} disetujui.`, 'success');
    return res.json({ success: true, proposal: updated, event: updated });
  } catch (error) {
    console.error('[Events APPROVE] error:', error);
    return res.status(500).json({ error: 'Gagal menyetujui event.' });
  }
});

app.post('/api/events/:id/reject', async (req, res) => {
  try {
    const id = String(req.params.id);
    const reason = String(req.body?.alasanPenolakan ?? '').trim();
    if (!reason) return res.status(400).json({ error: 'Wajib menyertakan alasan penolakan agar mitra dapat memperbaikinya.' });

    const event = await getEventById(id);
    if (!event) return res.status(404).json({ error: 'Permintaan pelatihan tidak ditemukan.' });
    const pool = await getPool();

    await pool.query(
      `UPDATE training_proposals SET status='ditolak', alasan_penolakan=?, is_aktif=FALSE, updated_at=CURRENT_TIMESTAMP
       WHERE proposal_id_string=?`,
      [reason, id]
    );
    const updated = await getEventById(id);
    await addSystemLog('Super Administrator', 'superadmin', 'Penolakan Event Pelatihan', 'events', `Event ${event.namaKegiatan} ditolak.`, 'warning');
    return res.json({ success: true, proposal: updated, event: updated });
  } catch (error) {
    console.error('[Events REJECT] error:', error);
    return res.status(500).json({ error: 'Gagal menolak event.' });
  }
});

// ======================== PARTICIPANTS ========================

async function getParticipantById(id: string) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT p.*, tp.nama_kegiatan AS eventTitle
     FROM participants p
     LEFT JOIN training_proposals tp ON tp.proposal_id_string = p.event_id_string
     WHERE p.participant_id_string = ? LIMIT 1`,
    [id]
  );
  return Array.isArray(rows) && rows.length ? mapDbParticipant(rows[0]) : null;
}

// Validasi tanggal TPQ di server agar format dan rentang tanggal konsisten.
function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}
function validateTPQDates(body: any): string | null {
  if (!isIsoDate(body.tanggalMulai) || !isIsoDate(body.tanggalSelesai)) return 'Tanggal mulai dan tanggal selesai harus valid.';
  if (body.tanggalSelesai < body.tanggalMulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  if (body.batasPendaftaran && (!isIsoDate(body.batasPendaftaran) || body.batasPendaftaran > body.tanggalMulai)) return 'Batas pendaftaran harus berupa tanggal valid dan tidak boleh melewati tanggal mulai.';
  const match = String(body.durasiProgram || '').trim().match(/^(?:program\s*)?(\d+)\s*(hari|minggu|bulan|tahun)$/i);
  if (match) {
    const amount = Number(match[1]);
    const start = new Date(`${body.tanggalMulai}T00:00:00Z`);
    const max = new Date(start);
    const unit = match[2].toLowerCase();
    if (unit === 'hari') max.setUTCDate(max.getUTCDate() + amount - 1);
    else if (unit === 'minggu') max.setUTCDate(max.getUTCDate() + amount * 7 - 1);
    else if (unit === 'bulan') { max.setUTCMonth(max.getUTCMonth() + amount); max.setUTCDate(max.getUTCDate() - 1); }
    else { max.setUTCFullYear(max.getUTCFullYear() + amount); max.setUTCDate(max.getUTCDate() - 1); }
    if (new Date(`${body.tanggalSelesai}T00:00:00Z`) > max) return `Tanggal selesai melewati durasi ${body.durasiProgram}.`;
  }
  return null;
}

// ======================== PENDIDIKAN TPQ ========================

app.get('/api/tpq', async (req, res) => {
  try {
    const pool = await getPool();
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    const params: any[] = [];
    const where: string[] = [];
    // Permintaan "program milik mitra" tanpa sesi valid ditolak, bukan dialihkan ke katalog publik semua mitra.
    if (!sessionUser && req.query.mitraId && req.query.publicCatalog !== 'true') {
      return res.status(401).json({ error: 'Sesi login tidak valid. Silakan login ulang.' });
    }
    if (!sessionUser || req.query.publicCatalog === 'true') {
      // Katalog homepage hanya melihat program yang sudah disetujui dan aktif, juga saat Mitra login.
      where.push("LOWER(TRIM(COALESCE(tp.status, ''))) = 'disetujui'", 'CAST(COALESCE(tp.izinkan_publikasi, 0) AS UNSIGNED) = 1');
    } else if (sessionUser.role !== 'superadmin') {
      // Mitra hanya dapat membaca program miliknya, tidak berdasarkan query yang bisa dipalsukan.
      where.push('tp.mitra_id_string = ?');
      params.push(sessionUser.id);
    }
    let sql = `SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo
               FROM tpq_programs tp
               LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY tp.created_at DESC, tp.id DESC';
    const [rows] = await pool.query(sql, params);
    return res.json({ programs: Array.isArray(rows) ? rows.map((row: any) => { const mapped = mapDbTPQ(row); if (!sessionUser || req.query.publicCatalog === 'true' || mapped.status !== 'disetujui') mapped.linkGrupWa = ''; return mapped; }) : [] });
  } catch (error) {
    console.error('[TPQ GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil program TPQ dari MySQL.' });
  }
});

app.post('/api/tpq', async (req, res) => {
  try {
    const body = req.body ?? {};
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    if (sessionUser.role !== 'mitra' && sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Akses ditolak.' });
    // Mitra hanya boleh membuat program atas namanya sendiri, tidak bisa memakai id mitra lain dari body.
    if (sessionUser.role === 'mitra') body.mitraId = sessionUser.id;
    const required = ['namaProgram', 'jenisTPQ', 'deskripsiProgram', 'provinsi', 'kota', 'lokasiDanAlamat', 'tanggalMulai', 'tanggalSelesai'];
    for (const key of required) if (!body[key]) return res.status(400).json({ error: `${key} wajib diisi.` });
    const dateError = validateTPQDates(body);
    if (dateError) return res.status(400).json({ error: dateError });
    if (!['isyarat', 'braille'].includes(body.jenisTPQ)) return res.status(400).json({ error: 'Jenis TPQ harus Isyarat atau Braille.' });
    if (body.linkGrupWa && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(String(body.linkGrupWa).trim())) return res.status(400).json({ error: 'Link WhatsApp harus berupa https://chat.whatsapp.com/...' });
    if (!Array.isArray(body.hariPertemuan) || body.hariPertemuan.length === 0) return res.status(400).json({ error: 'Hari pertemuan wajib dipilih.' });
    const pool = await getPool();
    const mitraIdString = body.mitraId ? String(body.mitraId) : null;
    let mitraNumericId: number | null = null;
    if (mitraIdString) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE user_id_string = ? LIMIT 1', [mitraIdString]);
      if (!Array.isArray(uRows) || !uRows.length) return res.status(400).json({ error: 'Mitra tidak ditemukan di MySQL.' });
      mitraNumericId = Number((uRows as any[])[0].id);
    }
    const id = `tpq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(`INSERT INTO tpq_programs
      (program_id_string, mitra_id, mitra_id_string, nama_program, jenis_tpq, deskripsi_program, tujuan_pembelajaran, target_peserta, kuota_peserta, materi_pembelajaran, metode_pembelajaran, kebutuhan_fasilitas, frekuensi_pertemuan, hari_pertemuan, jam_mulai, jam_selesai, tanggal_mulai, tanggal_selesai, batas_pendaftaran, benefit_program, provinsi, kota, lokasi_dan_alamat, latitude, longitude, durasi_program, foto_dokumentasi, link_grup_wa, status, is_aktif, jumlah_pendaftar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu_persetujuan', 0, 0)`, [
      id, mitraNumericId, mitraIdString, body.namaProgram, body.jenisTPQ, body.deskripsiProgram, body.tujuanPembelajaran || null, body.targetPeserta || null, Number(body.kuotaPeserta || 0), body.materiPembelajaran || null, body.metodePembelajaran || null, JSON.stringify(Array.isArray(body.kebutuhanFasilitas) ? body.kebutuhanFasilitas : []), body.frekuensiPertemuan || null, JSON.stringify(body.hariPertemuan), body.jamMulai || null, body.jamSelesai || null, body.tanggalMulai, body.tanggalSelesai, body.batasPendaftaran || null, body.benefitProgram || null, body.provinsi, body.kota, body.lokasiDanAlamat, Number(body.latitude), Number(body.longitude), String(body.durasiProgram || ''), JSON.stringify(Array.isArray(body.fotoDokumentasi) ? body.fotoDokumentasi : []), null
    ]);
    const [rows] = await pool.query('SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id WHERE tp.program_id_string=? LIMIT 1', [id]);
    return res.status(201).json({ program: mapDbTPQ((rows as any[])[0]) });
  } catch (error) {
    console.error('[TPQ POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan program TPQ ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/tpq/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const body = req.body ?? {};
    const pool = await getPool();
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    const [existing] = await pool.query('SELECT * FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(existing) || !existing.length) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    const existingProgram = (existing as any[])[0];
    const isSuperadmin = sessionUser.role === 'superadmin';
    if (!isSuperadmin && String(existingProgram.mitra_id_string || '') !== String(sessionUser.id)) return res.status(403).json({ error: 'Anda hanya dapat mengubah program TPQ milik sendiri.' });
    const dateError = validateTPQDates(body);
    if (dateError) return res.status(400).json({ error: dateError });
    const adminEdit = isSuperadmin;
    if (body.linkGrupWa && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(String(body.linkGrupWa).trim())) return res.status(400).json({ error: 'Link WhatsApp harus berupa https://chat.whatsapp.com/...' });
    await pool.query(`UPDATE tpq_programs SET nama_program=?, jenis_tpq=?, deskripsi_program=?, tujuan_pembelajaran=?, target_peserta=?, kuota_peserta=?, materi_pembelajaran=?, metode_pembelajaran=?, kebutuhan_fasilitas=?, frekuensi_pertemuan=?, hari_pertemuan=?, jam_mulai=?, jam_selesai=?, tanggal_mulai=?, tanggal_selesai=?, batas_pendaftaran=?, benefit_program=?, provinsi=?, kota=?, lokasi_dan_alamat=?, latitude=?, longitude=?, durasi_program=?, foto_dokumentasi=?, link_grup_wa=?, status=IF(?, status, 'menunggu_persetujuan'), is_aktif=IF(?, is_aktif, 0), izinkan_publikasi=IF(?, izinkan_publikasi, 0), updated_at=CURRENT_TIMESTAMP WHERE program_id_string=?`, [
      body.namaProgram, body.jenisTPQ, body.deskripsiProgram, body.tujuanPembelajaran || null, body.targetPeserta || null, Number(body.kuotaPeserta || 0), body.materiPembelajaran || null, body.metodePembelajaran || null, JSON.stringify(Array.isArray(body.kebutuhanFasilitas) ? body.kebutuhanFasilitas : []), body.frekuensiPertemuan || null, JSON.stringify(Array.isArray(body.hariPertemuan) ? body.hariPertemuan : []), body.jamMulai || null, body.jamSelesai || null, body.tanggalMulai || null, body.tanggalSelesai || null, body.batasPendaftaran || null, body.benefitProgram || null, body.provinsi, body.kota, body.lokasiDanAlamat, Number(body.latitude), Number(body.longitude), String(body.durasiProgram || ''), JSON.stringify(Array.isArray(body.fotoDokumentasi) ? body.fotoDokumentasi : []), (isSuperadmin && existingProgram.status === 'disetujui' ? (existingProgram.link_grup_wa || null) : null), adminEdit, adminEdit, adminEdit, id
    ]);
    const [rows] = await pool.query('SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id WHERE tp.program_id_string=? LIMIT 1', [id]);
    return res.json({ program: mapDbTPQ((rows as any[])[0]) });
  } catch (error) {
    console.error('[TPQ PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui program TPQ di MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

// Link grup WhatsApp Pendidikan TPQ, terpisah agar tidak tercampur dengan data publik.
app.get('/api/tpq/:id/wa-link', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    const pool = await getPool();
    const [rows] = await pool.query('SELECT link_grup_wa, status, mitra_id_string FROM tpq_programs WHERE program_id_string=? LIMIT 1', [String(req.params.id)]);
    if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    const row = (rows as any[])[0];
    if (sessionUser.role !== 'superadmin' && String(row.mitra_id_string || '') !== String(sessionUser.id)) return res.status(403).json({ error: 'Anda hanya dapat mengelola link WhatsApp program milik sendiri.' });
    if (row.status !== 'disetujui') return res.status(409).json({ error: 'Link WhatsApp baru tersedia setelah program disetujui Superadmin.' });
    return res.json({ waLink: row.link_grup_wa || '' });
  } catch (error) {
    console.error('[TPQ WA GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil link WhatsApp TPQ.' });
  }
});

app.put('/api/tpq/:id/wa-link', async (req, res) => {
  try {
    const id = String(req.params.id);
    const waLink = String(req.body?.waLink ?? '').trim();
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    if (waLink && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(waLink)) return res.status(400).json({ error: 'Gunakan link grup WhatsApp https://chat.whatsapp.com/...' });
    const pool = await getPool();
    const [found] = await pool.query('SELECT id, status, mitra_id_string, izinkan_publikasi FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(found) || !found.length) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    const row = (found as any[])[0];
    if (sessionUser.role !== 'superadmin' && String(row.mitra_id_string || '') !== String(sessionUser.id)) return res.status(403).json({ error: 'Anda hanya dapat mengatur link WhatsApp program milik sendiri.' });
    if (row.status !== 'disetujui') return res.status(409).json({ error: 'Link WhatsApp baru dapat diatur setelah program disetujui Superadmin.' });
    if (Boolean(Number(row.izinkan_publikasi)) && sessionUser.role !== 'superadmin') return res.status(409).json({ error: 'Link WhatsApp Mitra hanya dapat diubah sebelum program dipublikasikan.' });
    await pool.query('UPDATE tpq_programs SET link_grup_wa=? WHERE program_id_string=?', [waLink || null, id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[TPQ WA PUT] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan link WhatsApp TPQ.' });
  }
});

app.post('/api/tpq/:id/approve', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser || sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Hanya Superadmin yang dapat menyetujui Pendidikan TPQ.' });
    const id = String(req.params.id);
    const pool = await getPool();
    const [existing] = await pool.query('SELECT program_id_string, nama_program, status FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(existing) || !existing.length) return res.status(404).json({ error: 'Pengajuan Pendidikan TPQ tidak ditemukan.' });
    await pool.query("UPDATE tpq_programs SET status='disetujui', is_aktif=0, izinkan_publikasi=0, alasan_penolakan=NULL, updated_at=CURRENT_TIMESTAMP WHERE program_id_string=?", [id]);
    const [rows] = await pool.query('SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string WHERE tp.program_id_string=? LIMIT 1', [id]);
    const program = mapDbTPQ((rows as any[])[0]);
    await addSystemLog('Super Administrator', 'superadmin', 'Persetujuan Pendidikan TPQ', 'tpq', `Program TPQ ${program.namaProgram} disetujui.`, 'success');
    return res.json({ success: true, program });
  } catch (error) {
    console.error('[TPQ APPROVE] error:', error);
    return res.status(500).json({ error: 'Gagal menyetujui program TPQ.' });
  }
});

app.post('/api/tpq/:id/publish', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser || sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Hanya Superadmin yang dapat mengatur publikasi Pendidikan TPQ.' });
    const id = String(req.params.id);
    const allowed = Boolean(req.body?.izinkanPublikasi);
    const pool = await getPool();
    const [found] = await pool.query('SELECT nama_program, status, link_grup_wa FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(found) || !found.length) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    if (allowed && (found as any[])[0].status !== 'disetujui') return res.status(409).json({ error: 'Setujui program terlebih dahulu sebelum mengizinkan publikasi.' });
    if (allowed && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(String((found as any[])[0].link_grup_wa || ''))) return res.status(409).json({ error: 'Isi link grup WhatsApp terlebih dahulu sebelum memublikasikan program TPQ.' });
    await pool.query('UPDATE tpq_programs SET izinkan_publikasi=?, is_aktif=?, updated_at=CURRENT_TIMESTAMP WHERE program_id_string=?', [allowed ? 1 : 0, allowed ? 1 : 0, id]);
    await addSystemLog('Super Administrator', 'superadmin', allowed ? 'Izinkan Publikasi Pendidikan TPQ' : 'Cabut Publikasi Pendidikan TPQ', 'tpq', `Publikasi program TPQ ${(found as any[])[0].nama_program}: ${allowed ? 'diizinkan' : 'dinonaktifkan'}.`, 'success');
    return res.json({ success: true, izinkanPublikasi: allowed, isAktif: allowed });
  } catch (error) {
    console.error('[TPQ PUBLISH] error:', error);
    return res.status(500).json({ error: 'Gagal mengatur publikasi Pendidikan TPQ.' });
  }
});

app.post('/api/tpq/:id/reject', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser || sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Hanya Superadmin yang dapat menolak Pendidikan TPQ.' });
    const id = String(req.params.id);
    const reason = String(req.body?.alasanPenolakan ?? '').trim();
    if (!reason) return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
    const pool = await getPool();
    const [existing] = await pool.query('SELECT program_id_string, nama_program FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(existing) || !existing.length) return res.status(404).json({ error: 'Pengajuan Pendidikan TPQ tidak ditemukan.' });
    await pool.query("UPDATE tpq_programs SET status='ditolak', is_aktif=0, alasan_penolakan=?, updated_at=CURRENT_TIMESTAMP WHERE program_id_string=?", [reason, id]);
    const [rows] = await pool.query('SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string WHERE tp.program_id_string=? LIMIT 1', [id]);
    const program = mapDbTPQ((rows as any[])[0]);
    await addSystemLog('Super Administrator', 'superadmin', 'Penolakan Pendidikan TPQ', 'tpq', `Program TPQ ${program.namaProgram} ditolak. Alasan: ${reason}`, 'warning');
    return res.json({ success: true, program });
  } catch (error) {
    console.error('[TPQ REJECT] error:', error);
    return res.status(500).json({ error: 'Gagal menolak program TPQ.' });
  }
});

// Kolom gender pada tpq_registrations ditambahkan otomatis sekali per proses bila database lama belum punya.
let tpqGenderColumnReady = false;
async function ensureTpqGenderColumn(pool: any) {
  if (tpqGenderColumnReady) return;
  const [cols] = await pool.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tpq_registrations' AND COLUMN_NAME = 'gender'"
  );
  if (!Number((cols as any[])[0]?.n)) {
    await pool.query("ALTER TABLE tpq_registrations ADD COLUMN gender varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER kategori_disabilitas");
  }
  tpqGenderColumnReady = true;
}

// Daftar peserta TPQ untuk dashboard. Superadmin melihat semua; Mitra hanya peserta program TPQ miliknya.
// Harus didaftarkan SEBELUM route '/api/tpq/:id/...' agar "registrations" tidak dibaca sebagai :id.
app.get('/api/tpq/registrations', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    if (sessionUser.role !== 'mitra' && sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Akses ditolak.' });
    const pool = await getPool();
    await ensureTpqGenderColumn(pool);
    const params: any[] = [];
    let sql = `SELECT r.*, tp.nama_program AS programName, tp.mitra_id_string AS mitraId,
                      u.name AS mitraName, u.organization_name AS mitraOrg
               FROM tpq_registrations r
               JOIN tpq_programs tp ON tp.program_id_string = r.program_id_string
               LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string`;
    if (sessionUser.role === 'mitra') {
      sql += ' WHERE tp.mitra_id_string = ?';
      params.push(sessionUser.id);
    }
    sql += ' ORDER BY r.created_at DESC, r.id DESC';
    const [rows] = await pool.query(sql, params);
    const registrations = (Array.isArray(rows) ? rows : []).map((r: any) => ({
      id: String(r.registration_id_string ?? r.id),
      programId: String(r.program_id_string ?? ''),
      programName: r.programName ?? '',
      mitraName: r.mitraOrg || r.mitraName || '',
      namaLengkap: r.nama_lengkap ?? '',
      noWa: r.no_wa ?? '',
      email: r.email ?? '',
      usia: Number(r.usia ?? 0),
      kategoriDisabilitas: r.kategori_disabilitas ?? '',
      gender: r.gender ?? '',
      catatanKhusus: r.catatan_khusus ?? '',
      waktuDaftar: r.created_at ? new Date(r.created_at).toISOString() : '',
    }));
    return res.json({ registrations });
  } catch (error) {
    console.error('[TPQ registrations GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil peserta TPQ dari MySQL.' });
  }
});

// Pendaftaran peserta TPQ: link grup WhatsApp hanya dikembalikan setelah pendaftaran berhasil disimpan.
app.post('/api/tpq/:id/register', async (req, res) => {
  try {
    const id = String(req.params.id);
    const body = req.body ?? {};
    const nama = String(body.namaLengkap ?? '').trim();
    const noWa = String(body.noWa ?? '').trim();
    const email = String(body.email ?? '').trim();
    const usia = Number(body.usia);
    const disabilitas = String(body.kategoriDisabilitas ?? '').trim();
    const catatan = String(body.catatanKhusus ?? '').trim();
    const gender = String(body.gender ?? '').trim();
    if (!nama || !noWa || !email || !disabilitas) {
      return res.status(400).json({ error: 'Nama, nomor WhatsApp, email, dan kategori peserta wajib diisi.' });
    }
    // Usia opsional di formulir; bila diisi harus 1-120. Bila kosong disimpan 0.
    const usiaFinal = body.usia === undefined || body.usia === null || String(body.usia).trim() === '' ? 0 : usia;
    if (!Number.isInteger(usiaFinal) || usiaFinal < 0 || usiaFinal > 120) {
      return res.status(400).json({ error: 'Usia harus berupa angka antara 1 dan 120 tahun.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Format email tidak valid.' });
    if (!['Tunanetra', 'Tunarungu'].includes(disabilitas)) return res.status(400).json({ error: 'Kategori peserta harus Tunanetra atau Tunarungu.' });
    if (gender && !['Laki-laki', 'Perempuan'].includes(gender)) return res.status(400).json({ error: 'Gender tidak valid.' });
    const pool = await getPool();
    await ensureTpqGenderColumn(pool);
    const [rows] = await pool.query('SELECT id, nama_program, status, izinkan_publikasi, link_grup_wa, jumlah_pendaftar, kuota_peserta, batas_pendaftaran FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    const program = (rows as any[])[0];
    if (program.status !== 'disetujui' || !Boolean(Number(program.izinkan_publikasi))) return res.status(409).json({ error: 'Pendaftaran program ini belum dibuka.' });
    const waLink = String(program.link_grup_wa || '').trim();
    if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(waLink)) return res.status(409).json({ error: 'Link grup WhatsApp belum tersedia. Silakan hubungi penyelenggara.' });
    if (program.batas_pendaftaran && String(program.batas_pendaftaran).slice(0, 10) < new Date().toISOString().slice(0, 10)) return res.status(409).json({ error: 'Batas pendaftaran program ini sudah lewat.' });
    const quota = Number(program.kuota_peserta || 0);
    if (quota > 0 && Number(program.jumlah_pendaftar || 0) >= quota) return res.status(409).json({ error: 'Kuota peserta program ini sudah penuh.' });
    const registrationId = `tpqr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(`INSERT INTO tpq_registrations (registration_id_string, program_id_string, nama_lengkap, no_wa, email, usia, kategori_disabilitas, gender, catatan_khusus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [registrationId, id, nama, noWa, email, usiaFinal, disabilitas, gender || null, catatan || null]);
    await pool.query('UPDATE tpq_programs SET jumlah_pendaftar=jumlah_pendaftar+1 WHERE program_id_string=?', [id]);
    // Email = cadangan tautan grup WhatsApp. Bila gagal, pendaftaran tetap sukses.
    if (isRealEmail(email)) {
      sendWaLinkEmail({ to: email, nama, eventName: String(program.nama_program), waLink })
        .catch((mailErr: unknown) => console.error('[Mail] Gagal kirim link WA TPQ:', mailErr));
    }
    return res.status(201).json({ success: true, message: 'Pendaftaran TPQ berhasil dikirim.', waLink });
  } catch (error) {
    console.error('[TPQ REGISTER] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan pendaftaran TPQ.' });
  }
});

app.delete('/api/tpq/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    const pool = await getPool();
    const isSuperadmin = sessionUser.role === 'superadmin';
    const [rows] = await pool.query('SELECT id, mitra_id_string FROM tpq_programs WHERE program_id_string = ? LIMIT 1', [id]);
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    if (!isSuperadmin && String((rows as any[])[0].mitra_id_string || '') !== String(sessionUser.id)) {
      return res.status(403).json({ error: 'Anda hanya dapat menghapus program TPQ milik sendiri.' });
    }
    await pool.query('DELETE FROM tpq_programs WHERE program_id_string = ?', [id]);
    return res.json({ message: 'Program TPQ berhasil dihapus.' });
  } catch (error) {
    console.error('[TPQ DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus program TPQ dari MySQL.' });
  }
});

// ======================== LINK GRUP WHATSAPP EVENT ========================
// Dipakai form Kelola Event. Sengaja terpisah dari /api/events agar link tidak bocor ke halaman publik.
app.get('/api/events/:id/wa-link', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT link_grup_wa FROM training_proposals WHERE proposal_id_string=? LIMIT 1',
      [String(req.params.id)]
    );
    if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Event tidak ditemukan.' });
    return res.json({ waLink: (rows as any[])[0].link_grup_wa ?? '' });
  } catch (error) {
    console.error('[WA-link GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil link grup WhatsApp.' });
  }
});

app.put('/api/events/:id/wa-link', async (req, res) => {
  try {
    const id = String(req.params.id);
    const waLink = String(req.body?.waLink ?? '').trim();
    if (waLink && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(waLink)) {
      return res.status(400).json({ error: 'Harus berupa link grup WhatsApp (https://chat.whatsapp.com/...).' });
    }

    const pool = await getPool();
    const [found] = await pool.query('SELECT id FROM training_proposals WHERE proposal_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(found) || !found.length) return res.status(404).json({ error: 'Event tidak ditemukan.' });

    await pool.query('UPDATE training_proposals SET link_grup_wa=? WHERE proposal_id_string=?', [waLink || null, id]);

    // Peserta yang daftar sebelum link ada (atau emailnya gagal) dan punya email asli
    let pending: any[] = [];
    if (waLink) {
      const [rows] = await pool.query(
        `SELECT p.participant_id_string AS pid, p.nama_lengkap AS nama, p.email, tp.nama_kegiatan AS eventName
         FROM participants p
         JOIN training_proposals tp ON tp.id = p.training_proposal_id
         WHERE tp.proposal_id_string=? AND p.link_sent=0 AND p.status_kehadiran <> 'batal'
           AND p.email NOT LIKE '%@peserta.id'`,
        [id]
      );
      pending = Array.isArray(rows) ? (rows as any[]) : [];
    }

    // Balas dulu supaya form tidak menunggu; email dikirim di belakang layar.
    res.json({ success: true, antrean: pending.length });

    for (const p of pending) {
      try {
        await sendWaLinkEmail({ to: p.email, nama: p.nama, eventName: p.eventName, waLink });
        await pool.query('UPDATE participants SET link_sent=1 WHERE participant_id_string=?', [p.pid]);
      } catch (mailErr) {
        console.error('[Mail] Gagal kirim ke', p.email, mailErr);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500)); // jeda agar aman dari batas kirim Gmail
    }
  } catch (error) {
    console.error('[WA-link PUT] error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Gagal menyimpan link grup WhatsApp.' });
  }
});

app.get('/api/participants', async (req, res) => {
  try {
    const pool = await getPool();
    const params: any[] = [];
    const where: string[] = [];
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    // Jangan izinkan Mitra mengambil daftar global. Batasi hanya event milik akun tersebut.
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    if (sessionUser.role === 'mitra') {
      // Tabel training_proposals tidak punya kolom mitra_org; pemilik dicocokkan lewat id string atau id numerik user.
      where.push('(tp.mitra_id_string = ? OR tp.mitra_id = (SELECT u.id FROM users u WHERE u.user_id_string = ? LIMIT 1))');
      params.push(sessionUser.id, sessionUser.id);
    } else if (sessionUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    if (typeof req.query.eventId === 'string' && req.query.eventId) { where.push('p.event_id_string = ?'); params.push(req.query.eventId); }
    if (typeof req.query.disability === 'string' && req.query.disability) { where.push('p.kategori_disabilitas = ?'); params.push(req.query.disability); }

    let sql = `SELECT p.*, tp.nama_kegiatan AS eventTitle
               FROM participants p
               LEFT JOIN training_proposals tp ON tp.proposal_id_string=p.event_id_string`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY p.created_at DESC, p.id DESC';

    const [rows] = await pool.query(sql, params);
    return res.json({ participants: Array.isArray(rows) ? rows.map(mapDbParticipant) : [] });
  } catch (error) {
    console.error('[Participants GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil peserta dari MySQL.' });
  }
});

app.post('/api/participants', async (req, res) => {
  try {
    const body = req.body ?? {};
    const { eventId, namaLengkap, noWa, email, usia, kategoriDisabilitas, kebutuhanFasilitas, catatanKhusus } = body;
    if (!eventId || !namaLengkap || !noWa || !kategoriDisabilitas) {
      return res.status(400).json({ error: 'Nama lengkap, Nomor WhatsApp, dan Kategori Disabilitas wajib diisi' });
    }

    const pool = await getPool();
    const [eventRows] = await pool.query(
      `SELECT id, proposal_id_string, nama_kegiatan, COALESCE(kuota_disetujui, target_dan_kuota_peserta) AS maxQuota,
              jumlah_pendaftar, is_aktif, status
       FROM training_proposals WHERE proposal_id_string=? LIMIT 1`,
      [String(eventId)]
    );
    if (!Array.isArray(eventRows) || !eventRows.length) return res.status(404).json({ error: 'Event pelatihan tidak ditemukan' });

    const event = eventRows[0] as any;
    const maxQuota = Number(event.maxQuota || 0);
    if (maxQuota > 0 && Number(event.jumlah_pendaftar || 0) >= maxQuota) {
      return res.status(400).json({ error: 'Mohon maaf, kuota pendaftaran untuk pelatihan ini sudah penuh.' });
    }

    const participantId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fasilitas = Array.isArray(kebutuhanFasilitas) ? kebutuhanFasilitas : [];

    await pool.query(
      `INSERT INTO participants
       (participant_id_string, training_proposal_id, event_id_string, nama_lengkap, no_wa, email, usia,
        kategori_disabilitas, kebutuhan_fasilitas, catatan_khusus, status_kehadiran)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'terdaftar')`,
      [
        participantId, Number(event.id), String(eventId), String(namaLengkap).trim(), String(noWa).trim(),
        email ? String(email).trim() : `${String(noWa).trim()}@peserta.id`,
        Number(usia || 0), String(kategoriDisabilitas), JSON.stringify(fasilitas), catatanKhusus || null
      ]
    );
    await pool.query('UPDATE training_proposals SET jumlah_pendaftar = jumlah_pendaftar + 1 WHERE id = ?', [Number(event.id)]);

    // Link grup WA hanya diberikan setelah pendaftaran berhasil, dan hanya untuk event yang disetujui & aktif.
    // Link TIDAK pernah ikut di GET /api/events (mapDbEvent memakai daftar field tetap).
    const [waRows] = await pool.query(
      `SELECT link_grup_wa FROM training_proposals
       WHERE id=? AND status='disetujui' AND is_aktif=1 LIMIT 1`,
      [Number(event.id)]
    );
    const waLink: string | null = (waRows as any[])[0]?.link_grup_wa || null;

    // Email = cadangan kalau peserta menutup halaman. Kalau gagal, pendaftaran tetap sukses.
    const cleanEmail = email ? String(email).trim() : '';
    if (waLink && isRealEmail(cleanEmail)) {
      sendWaLinkEmail({
        to: cleanEmail,
        nama: String(namaLengkap).trim(),
        eventName: String(event.nama_kegiatan),
        waLink,
      })
        .then(() => pool.query('UPDATE participants SET link_sent=1 WHERE participant_id_string=?', [participantId]))
        .catch((mailErr: unknown) => console.error('[Mail] Gagal kirim link WA:', mailErr));
    }

    const participant = await getParticipantById(participantId);
    const updatedEvent = await getEventById(String(eventId));
    return res.status(201).json({
      success: true,
      participant,
      event: updatedEvent,
      jumlahPendaftar: updatedEvent?.jumlahPendaftar ?? 0,
      waLink,
    });
  } catch (error) {
    console.error('[Participants POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan peserta ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.patch('/api/participants/:id/status', async (req, res) => {
  try {
    const id = String(req.params.id);
    const status = req.body?.statusKehadiran;
    if (!['terdaftar', 'hadir', 'batal'].includes(status)) return res.status(400).json({ error: 'Status kehadiran tidak valid.' });

    const pool = await getPool();
    const participant = await getParticipantById(id);
    if (!participant) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    await pool.query('UPDATE participants SET status_kehadiran=?, updated_at=CURRENT_TIMESTAMP WHERE participant_id_string=?', [status, id]);
    return res.json({ success: true, participant: await getParticipantById(id) });
  } catch (error) {
    console.error('[Participants STATUS] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui status peserta.' });
  }
});

app.put('/api/participants/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const current = await getParticipantById(id);
    if (!current) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    const body = req.body ?? {};
    const pool = await getPool();

    await pool.query(
      `UPDATE participants SET
        nama_lengkap=?, no_wa=?, email=?, usia=?, kategori_disabilitas=?,
        kebutuhan_fasilitas=?, catatan_khusus=?, status_kehadiran=?, updated_at=CURRENT_TIMESTAMP
       WHERE participant_id_string=?`,
      [
        body.namaLengkap ?? current.namaLengkap,
        body.noWa ?? current.noWa,
        body.email ?? current.email,
        body.usia !== undefined ? Number(body.usia) : current.usia,
        body.kategoriDisabilitas ?? current.kategoriDisabilitas,
        JSON.stringify(body.kebutuhanFasilitas !== undefined ? body.kebutuhanFasilitas : current.kebutuhanFasilitas),
        body.catatanKhusus !== undefined ? body.catatanKhusus : current.catatanKhusus,
        body.statusKehadiran ?? current.statusKehadiran,
        id
      ]
    );
    return res.json({ success: true, participant: await getParticipantById(id) });
  } catch (error) {
    console.error('[Participants PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui peserta di MySQL.' });
  }
});

app.delete('/api/participants/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const participant = await getParticipantById(id);
    if (!participant) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });

    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM participants WHERE participant_id_string=?', [id]);
    if ((result as any).affectedRows) {
      await pool.query(
        `UPDATE training_proposals SET jumlah_pendaftar=GREATEST(jumlah_pendaftar - 1, 0)
         WHERE proposal_id_string=?`,
        [participant.eventId]
      );
    }
    return res.json({ success: true, message: `Peserta ${participant.namaLengkap} berhasil dihapus`, participantId: id });
  } catch (error) {
    console.error('[Participants DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus peserta dari MySQL.' });
  }
});

// ======================== DISABILITIES ========================

app.get('/api/disabilities', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id, disability_id_string, kode, nama, kategori_utama, deskripsi,
              metode_pembelajaran, fasilitas_rekomendasi, warna_hex, icon, is_aktif, created_at
       FROM disabilities ORDER BY created_at DESC, id DESC`
    );
    const disabilities = Array.isArray(rows) ? rows.map(mapDbDisability) : [];
    return res.json({ disabilities, data: disabilities });
  } catch (error) {
    console.error('[Disabilities GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil kategori disabilitas dari MySQL.' });
  }
});

app.post('/api/disabilities', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.kode || !body.nama) return res.status(400).json({ error: 'Kode dan Nama Kategori Disabilitas wajib diisi' });

    const pool = await getPool();
    const kode = String(body.kode).trim().toLowerCase().replace(/\s+/g, '_');
    const [existing] = await pool.query('SELECT id FROM disabilities WHERE LOWER(kode)=? LIMIT 1', [kode]);
    if (Array.isArray(existing) && existing.length) return res.status(409).json({ error: `Kode disabilitas "${kode}" sudah ada dalam master data` });

    const id = `dis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO disabilities
       (disability_id_string, kode, nama, kategori_utama, deskripsi, metode_pembelajaran,
        fasilitas_rekomendasi, warna_hex, icon, is_aktif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        id, kode, String(body.nama).trim(), body.kategoriUtama || 'Sensorik',
        body.deskripsi || '', body.metodePembelajaran || 'Metode pembelajaran ramah disabilitas standar Kemenag RI',
        JSON.stringify(Array.isArray(body.fasilitasRekomendasi) ? body.fasilitasRekomendasi : []),
        body.warnaHex || '#005a71', body.icon || 'accessible'
      ]
    );
    const [rows] = await pool.query('SELECT * FROM disabilities WHERE disability_id_string=? LIMIT 1', [id]);
    const disability = Array.isArray(rows) && rows.length ? mapDbDisability(rows[0]) : null;
    return res.status(201).json({ success: true, disability, item: disability });
  } catch (error) {
    console.error('[Disabilities POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan kategori disabilitas ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/disabilities/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const [currentRows] = await pool.query('SELECT * FROM disabilities WHERE disability_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(currentRows) || !currentRows.length) return res.status(404).json({ error: 'Data disabilitas tidak ditemukan' });

    const current = currentRows[0] as any;
    const body = req.body ?? {};
    const kode = body.kode !== undefined ? String(body.kode).trim().toLowerCase().replace(/\s+/g, '_') : current.kode;

    const [dupe] = await pool.query('SELECT id FROM disabilities WHERE LOWER(kode)=? AND disability_id_string<>? LIMIT 1', [kode, id]);
    if (Array.isArray(dupe) && dupe.length) return res.status(409).json({ error: `Kode disabilitas "${kode}" sudah digunakan.` });

    await pool.query(
      `UPDATE disabilities SET
       kode=?, nama=?, kategori_utama=?, deskripsi=?, metode_pembelajaran=?,
       fasilitas_rekomendasi=?, warna_hex=?, icon=?, is_aktif=?, updated_at=CURRENT_TIMESTAMP
       WHERE disability_id_string=?`,
      [
        kode,
        body.nama ?? current.nama,
        body.kategoriUtama ?? current.kategori_utama,
        body.deskripsi !== undefined ? body.deskripsi : current.deskripsi,
        body.metodePembelajaran ?? current.metode_pembelajaran,
        JSON.stringify(body.fasilitasRekomendasi !== undefined ? body.fasilitasRekomendasi : jsonParse<string[]>(current.fasilitas_rekomendasi, [])),
        body.warnaHex ?? current.warna_hex,
        body.icon ?? current.icon,
        body.isAktif !== undefined ? Boolean(body.isAktif) : Boolean(current.is_aktif),
        id
      ]
    );
    const [rows] = await pool.query('SELECT * FROM disabilities WHERE disability_id_string=? LIMIT 1', [id]);
    const disability = Array.isArray(rows) && rows.length ? mapDbDisability(rows[0]) : null;
    return res.json({ success: true, disability, item: disability });
  } catch (error) {
    console.error('[Disabilities PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kategori disabilitas di MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/disabilities/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const [rows] = await pool.query('SELECT nama FROM disabilities WHERE disability_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Data disabilitas tidak ditemukan' });

    try {
      const [result] = await pool.query('DELETE FROM disabilities WHERE disability_id_string=?', [id]);
      if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Data disabilitas tidak ditemukan' });
      return res.json({ success: true, message: `Kategori disabilitas "${(rows[0] as any).nama}" berhasil dihapus`, id });
    } catch (dbError: any) {
      if (dbError?.code === 'ER_ROW_IS_REFERENCED_2' || dbError?.code === 'ER_ROW_IS_REFERENCED') {
        return res.status(409).json({
          error: 'Kategori disabilitas masih digunakan oleh data lain sehingga tidak dapat dihapus. Nonaktifkan kategori tersebut terlebih dahulu.',
          code: dbError.code
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('[Disabilities DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus kategori disabilitas dari MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

// ======================== EVENT CATEGORIES ========================

app.get('/api/event-categories', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id, category_id_string, kode, nama, deskripsi, icon, warna_hex, is_aktif, urutan, created_at, updated_at
       FROM event_categories ORDER BY urutan ASC, id ASC`
    );
    const [evRows] = await pool.query('SELECT jenis_event, nama_kegiatan, event_category_id_string FROM training_proposals');
    const events = Array.isArray(evRows) ? evRows : [];

    const categories = Array.isArray(rows) ? rows.map(mapDbEventCategory).map((cat) => {
      const count = events.filter((e: any) => {
        const j = String(e.jenis_event || '').toLowerCase();
        const n = cat.nama.toLowerCase();
        const k = cat.kode.toLowerCase();
        return j === n || j === k || (k.length > 2 && j.includes(k)) || (cat.kode === 'Orang Umum' && j.includes('umum'));
      }).length;
      return { ...cat, eventCount: count };
    }) : [];

    return res.json({ categories, data: categories });
  } catch (error) {
    console.error('[EventCategories GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil kategori event.' });
  }
});

app.post('/api/event-categories', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.nama) return res.status(400).json({ error: 'Nama Kategori Event wajib diisi.' });

    const pool = await getPool();
    const rawKode = body.kode ? String(body.kode).trim() : String(body.nama).trim();
    const kode = rawKode.replace(/[^a-zA-Z0-9\s_-]/g, '').trim();

    const [existing] = await pool.query('SELECT id FROM event_categories WHERE LOWER(kode)=? LIMIT 1', [kode.toLowerCase()]);
    if (Array.isArray(existing) && existing.length) {
      return res.status(409).json({ error: `Kode/nama kategori "${kode}" sudah ada.` });
    }

    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const [all] = await pool.query('SELECT id FROM event_categories');
    const urutan = Number(body.urutan || (Array.isArray(all) ? all.length + 1 : 1));

    await pool.query(
      `INSERT INTO event_categories
       (category_id_string, kode, nama, deskripsi, icon, warna_hex, is_aktif, urutan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        kode,
        String(body.nama).trim(),
        body.deskripsi || '',
        body.icon || 'category',
        body.warnaHex || '#0284c7',
        body.isAktif !== undefined ? Boolean(body.isAktif) : true,
        urutan,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM event_categories WHERE category_id_string=? LIMIT 1', [id]);
    const category = Array.isArray(rows) && rows.length ? mapDbEventCategory(rows[0]) : null;
    await addSystemLog('Super Admin', 'superadmin', 'Tambah Kategori Event', 'Kategori Event', `Menambahkan kategori "${body.nama}"`);
    return res.status(201).json({ success: true, category, item: category });
  } catch (error) {
    console.error('[EventCategories POST] error:', error);
    return res.status(500).json({ error: 'Gagal menambahkan kategori event.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/event-categories/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const [currentRows] = await pool.query('SELECT * FROM event_categories WHERE category_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(currentRows) || !currentRows.length) {
      return res.status(404).json({ error: 'Kategori event tidak ditemukan.' });
    }

    const current = currentRows[0] as any;
    const body = req.body ?? {};
    const oldName = current.nama;
    const oldKode = current.kode;
    const newName = body.nama !== undefined ? String(body.nama).trim() : oldName;
    const newKode = body.kode !== undefined ? String(body.kode).trim() : oldKode;

    // Check duplicate code if changed
    if (newKode.toLowerCase() !== oldKode.toLowerCase()) {
      const [dupe] = await pool.query(
        'SELECT id FROM event_categories WHERE LOWER(kode)=? AND category_id_string<>? LIMIT 1',
        [newKode.toLowerCase(), id]
      );
      if (Array.isArray(dupe) && dupe.length) {
        return res.status(409).json({ error: `Kode kategori "${newKode}" sudah digunakan.` });
      }
    }

    // Cascade update: If name or code changed, cascade edit to all associated events!
    if (newName && (newName !== oldName || newKode !== oldKode)) {
      try {
        await pool.query(
          'UPDATE training_proposals SET jenis_event=? WHERE jenis_event=? OR jenis_event=?',
          [newName, oldName, oldKode]
        );
      } catch (cascadeErr) {
        console.warn('[Cascade Update Warning]', cascadeErr);
      }
    }

    await pool.query(
      `UPDATE event_categories SET
       kode=?, nama=?, deskripsi=?, icon=?, warna_hex=?, is_aktif=?, urutan=?, updated_at=CURRENT_TIMESTAMP
       WHERE category_id_string=?`,
      [
        newKode,
        newName,
        body.deskripsi !== undefined ? body.deskripsi : current.deskripsi,
        body.icon ?? current.icon,
        body.warnaHex ?? current.warna_hex,
        body.isAktif !== undefined ? Boolean(body.isAktif) : Boolean(current.is_aktif),
        body.urutan !== undefined ? Number(body.urutan) : Number(current.urutan || 0),
        id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM event_categories WHERE category_id_string=? LIMIT 1', [id]);
    const category = Array.isArray(rows) && rows.length ? mapDbEventCategory(rows[0]) : null;
    await addSystemLog('Super Admin', 'superadmin', 'Edit Kategori Event', 'Kategori Event', `Memperbarui kategori "${newName}" (sinkronisasi event berhasil)`);
    return res.json({ success: true, category, item: category });
  } catch (error) {
    console.error('[EventCategories PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kategori event.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/event-categories/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const [rows] = await pool.query('SELECT nama, kode FROM event_categories WHERE category_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(404).json({ error: 'Kategori event tidak ditemukan.' });
    }

    const oldName = (rows[0] as any).nama;
    const oldKode = (rows[0] as any).kode;

    // Putuskan relasi kategori baru agar tidak menyisakan ID kategori yang sudah dihapus.
    try {
      await pool.query(
        'UPDATE training_proposals SET event_category_id_string=NULL WHERE event_category_id_string=?',
        [id]
      );
    } catch (cascadeErr) {
      console.warn('[Cascade Delete Warning] event_category_id_string:', cascadeErr);
    }

    // Cascade legacy untuk event lama yang masih memakai jenis_event.
    try {
      await pool.query(
        'UPDATE training_proposals SET jenis_event=? WHERE jenis_event=? OR jenis_event=?',
        ['Pelatihan Al-Quran', oldName, oldKode]
      );
    } catch (cascadeErr) {
      console.warn('[Cascade Delete Warning]', cascadeErr);
    }

    await pool.query('DELETE FROM event_categories WHERE category_id_string=?', [id]);
    await addSystemLog('Super Admin', 'superadmin', 'Hapus Kategori Event', 'Kategori Event', `Menghapus kategori "${oldName}"`);
    return res.json({ success: true, message: `Kategori event "${oldName}" berhasil dihapus.`, id });
  } catch (error) {
    console.error('[EventCategories DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus kategori event.', details: error instanceof Error ? error.message : String(error) });
  }
});

// ======================== COMMUNITIES ========================

app.get('/api/communities', async (req, res) => {
  try {
    const pool = await getPool();
    const params: any[] = [];
    const where: string[] = [];
    if (typeof req.query.category === 'string' && req.query.category) {
      where.push('JSON_CONTAINS(kategori_disabilitas, ?)');
      params.push(JSON.stringify(String(req.query.category)));
    }
    if (typeof req.query.province === 'string' && req.query.province) {
      where.push('LOWER(provinsi)=LOWER(?)');
      params.push(req.query.province);
    }

    let sql = `SELECT qc.*, users.organization_logo AS user_org_logo, COUNT(tp.id) AS activeEventsCount
               FROM quran_communities qc
               LEFT JOIN users ON users.id = qc.user_id
               LEFT JOIN training_proposals tp ON tp.provinsi=qc.provinsi AND tp.is_aktif=1`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY qc.id ORDER BY qc.created_at DESC, qc.id DESC`;

    const [rows] = await pool.query(sql, params);
    return res.json({ communities: Array.isArray(rows) ? rows.map(mapDbCommunity) : [] });
  } catch (error) {
    console.error('[Communities GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil komunitas dari MySQL.' });
  }
});

app.post('/api/communities', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.namaLembaga || !body.alamatLengkap || !body.provinsi || !body.kota) {
      return res.status(400).json({ error: 'Nama Lembaga, Alamat, Provinsi, dan Kota wajib diisi' });
    }

    const pool = await getPool();
    let numericUserId: number | null = null;
    const userIdString = body.userId ? String(body.userId) : null;
    if (userIdString) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE user_id_string=? LIMIT 1', [userIdString]);
      if (!Array.isArray(uRows) || !uRows.length) return res.status(400).json({ error: 'Pengguna pemilik komunitas tidak ditemukan.' });
      numericUserId = Number((uRows as any[])[0].id);
    }

    const id = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO quran_communities
       (community_id_string, user_id, nama_lembaga, kategori_disabilitas, provinsi, kota,
        alamat_lengkap, latitude, longitude, kontak_wa, kontak_email, jumlah_santri,
        fasilitas_tersedia, program_unggulan, deskripsi, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        id, numericUserId, String(body.namaLembaga).trim(),
        JSON.stringify(Array.isArray(body.kategoriDisabilitas) ? body.kategoriDisabilitas : []),
        String(body.provinsi), String(body.kota), String(body.alamatLengkap),
        Number(body.latitude || 0), Number(body.longitude || 0),
        String(body.kontakWa || ''), body.kontakEmail || null, Number(body.jumlahSantri || 0),
        JSON.stringify(Array.isArray(body.fasilitasTersedia) ? body.fasilitasTersedia : []),
        String(body.programUnggulan || ''), String(body.deskripsi || '')
      ]
    );
    const [rows] = await pool.query('SELECT * FROM quran_communities WHERE community_id_string=? LIMIT 1', [id]);
    const community = Array.isArray(rows) && rows.length ? mapDbCommunity(rows[0]) : null;
    return res.status(201).json({ success: true, community });
  } catch (error) {
    console.error('[Communities POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan komunitas ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

// ======================== REPORTS ========================

app.get('/api/reports/summary', async (req, res) => {
  try {
    const pool = await getPool();

    const [statsRows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM training_proposals) AS totalProposals,
        (SELECT COUNT(*) FROM training_proposals WHERE status='disetujui') AS approvedEvents,
        (SELECT COUNT(*) FROM training_proposals WHERE status='menunggu_persetujuan') AS pendingProposals,
        (SELECT COUNT(*) FROM training_proposals WHERE status='ditolak') AS rejectedProposals,
        (SELECT COUNT(*) FROM participants) AS totalParticipants,
        (SELECT COUNT(*) FROM quran_communities) AS totalCommunities,
        (SELECT COUNT(*) FROM users WHERE role='mitra') AS totalMitra,
        (SELECT COUNT(*) FROM users WHERE role='superadmin') AS totalSuperAdmin`
    );
    const statsRow = (statsRows as any[])[0] ?? {};

    const [participantsRows] = await pool.query(
      `SELECT p.*, tp.nama_kegiatan AS eventTitle
       FROM participants p LEFT JOIN training_proposals tp ON tp.proposal_id_string=p.event_id_string
       ORDER BY p.created_at DESC`
    );
    const reportParticipants = Array.isArray(participantsRows) ? participantsRows.map(mapDbParticipant) : [];

    const [eventsRows] = await pool.query(
      `SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg
       FROM training_proposals tp LEFT JOIN users u ON u.id=tp.mitra_id
       ORDER BY tp.created_at DESC`
    );
    const reportEvents = Array.isArray(eventsRows) ? eventsRows.map(mapDbEvent) : [];

    const [communityRows] = await pool.query(`SELECT provinsi, COUNT(*) AS total FROM quran_communities GROUP BY provinsi`);
    const regionBreakdown: Record<string, number> = {};
    for (const row of communityRows as any[]) regionBreakdown[row.provinsi] = Number(row.total);

    const disabilityRows = await pool.query(
      `SELECT kategori_disabilitas, COUNT(*) AS total FROM participants GROUP BY kategori_disabilitas`
    );
    const disabilityCounts: Record<string, number> = {};
    for (const row of disabilityRows[0] as any[]) disabilityCounts[row.kategori_disabilitas] = Number(row.total);

    const funnelStages = {
      totalPendaftar: reportParticipants.length,
      terverifikasi: reportParticipants.filter(p => p.kebutuhanFasilitas.length > 0 || Boolean(p.noWa)).length,
      assessment: reportParticipants.filter(p => p.statusKehadiran !== 'batal').length,
      pelatihanAktif: reportParticipants.filter(p => p.statusKehadiran === 'terdaftar' || p.statusKehadiran === 'hadir').length,
      lulusSertifikasi: reportParticipants.filter(p => p.statusKehadiran === 'hadir').length,
    };

    const stats: SystemStats = {
      totalProposals: Number(statsRow.totalProposals || 0),
      approvedEvents: Number(statsRow.approvedEvents || 0),
      pendingProposals: Number(statsRow.pendingProposals || 0),
      rejectedProposals: Number(statsRow.rejectedProposals || 0),
      totalParticipants: Number(statsRow.totalParticipants || 0),
      totalCommunities: Number(statsRow.totalCommunities || 0),
      totalMitra: Number(statsRow.totalMitra || 0),
      totalSuperAdmin: Number(statsRow.totalSuperAdmin || 0),
    };

    return res.json({ stats, disabilityCounts, funnelStages, regionBreakdown, participants: reportParticipants, events: reportEvents });
  } catch (error) {
    console.error('[Reports Summary] error:', error);
    return res.status(500).json({ error: 'Gagal membuat ringkasan laporan.' });
  }
});

async function ensureInitialPasswords() {
  try {
    const pool = await getPool();
    const initialHash = await bcrypt.hash('password123', 12);
    const [rows] = await pool.query(
      `SELECT user_id_string, password FROM users
       WHERE password IS NULL OR password='' OR password LIKE '%REPLACE_WITH_%' OR password NOT LIKE '$2%'`
    );
    for (const row of rows as any[]) {
      await pool.query('UPDATE users SET password=? WHERE user_id_string=?', [initialHash, row.user_id_string]);
      console.log(`[Auth] Password awal password123 diterapkan ke akun ${row.user_id_string}.`);
    }
  } catch (error) {
    console.error('[Auth] Gagal memeriksa password awal:', error);
  }
}

// ======================== SERVER & VITE INTEGRATION ========================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const frontendRoot = path.resolve(process.cwd(), '../frontend');
    const vite = await createViteServer({
      root: frontendRoot,
      configFile: path.join(frontendRoot, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), '../frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
      await getDbPool();
      await syncAllMitraCommunities();
      await ensureInitialPasswords();
      console.log('[MySQL] Database siap dan tersinkronisasi.');
    } catch (err) {
      console.error('[MySQL] Koneksi database gagal:', err);
    }
  });
}

startServer();