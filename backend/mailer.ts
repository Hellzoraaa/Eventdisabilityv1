import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD belum diisi di file .env');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Email palsu bentukan server (nomorWA@peserta.id) tidak boleh dikirimi.
export const isRealEmail = (email?: string | null): boolean =>
  !!email && /^\S+@\S+\.\S+$/.test(email) && !email.endsWith('@peserta.id');

export async function sendWaLinkEmail(p: { to: string; nama: string; eventName: string; waLink: string }) {
  const text = [
    `Halo ${p.nama},`,
    '',
    `Terima kasih sudah mendaftar di ${p.eventName}. Pendaftaran Anda sudah kami terima.`,
    'Untuk informasi dan pengumuman selanjutnya, silakan bergabung ke grup WhatsApp event melalui tautan berikut:',
    '',
    p.waLink,
    '',
    'Gunakan nomor WhatsApp yang sama dengan yang Anda daftarkan.',
    '',
    'Email ini dikirim otomatis karena Anda mendaftar pada kegiatan tersebut. Jika Anda tidak merasa mendaftar, abaikan email ini.',
  ].join('\n');

  const html = `
    <p>Halo ${esc(p.nama)},</p>
    <p>Terima kasih sudah mendaftar di <b>${esc(p.eventName)}</b>. Pendaftaran Anda sudah kami terima.</p>
    <p>Untuk informasi dan pengumuman selanjutnya, silakan bergabung ke grup WhatsApp event melalui tautan berikut:</p>
    <p><a href="${p.waLink}">${p.waLink}</a></p>
    <p>Gunakan nomor WhatsApp yang sama dengan yang Anda daftarkan.</p>
    <p><small>Email ini dikirim otomatis karena Anda mendaftar pada kegiatan tersebut. Jika Anda tidak merasa mendaftar, abaikan email ini.</small></p>`;

  await getTransporter().sendMail({
    from: `"${process.env.MAIL_SENDER_NAME || 'Panitia Event'}" <${process.env.GMAIL_USER}>`,
    replyTo: process.env.GMAIL_USER,
    to: p.to,
    subject: `Pendaftaran ${p.eventName} diterima`,
    text,
    html,
  });
} 