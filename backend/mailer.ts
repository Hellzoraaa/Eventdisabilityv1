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
    `Assalamualaikum Warahmatullahi Wabarakatuh ${p.nama},`,
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
    <p>Assalamualaikum Warahmatullahi Wabarakatuh ${esc(p.nama)},</p>
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

export async function sendOtpEmail(p: { to: string; nama: string; otp: string; minutes: number }) {
  const text = [
    `Assalamualaikum Warahmatullahi Wabarakatuh ${p.nama},`,
    '',
    `Kode OTP untuk mengatur ulang kata sandi Anda: ${p.otp}`,
    `Kode berlaku ${p.minutes} menit dan hanya bisa dipakai sekali.`,
    '',
    'Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku admin.',
    'Jika Anda tidak meminta reset kata sandi, abaikan email ini. Kata sandi Anda tidak berubah.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
      <p>Assalamualaikum Warahmatullahi Wabarakatuh ${esc(p.nama)},</p>
      <p>Gunakan kode OTP berikut untuk mengatur ulang kata sandi akun Anda:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f1f5f9;border-radius:12px;padding:16px;text-align:center;margin:20px 0">${esc(p.otp)}</p>
      <p>Kode berlaku <b>${p.minutes} menit</b> dan hanya bisa dipakai sekali.</p>
      <p style="color:#b91c1c"><b>Jangan bagikan kode ini kepada siapa pun</b>, termasuk pihak yang mengaku admin.</p>
      <p style="color:#64748b;font-size:13px">Jika Anda tidak meminta reset kata sandi, abaikan email ini. Kata sandi Anda tidak berubah.</p>
    </div>`;

  await getTransporter().sendMail({
    from: `"${process.env.MAIL_SENDER_NAME || 'Panitia Event'}" <${process.env.GMAIL_USER}>`,
    replyTo: process.env.GMAIL_USER,
    to: p.to,
    subject: `Kode OTP reset kata sandi: ${p.otp}`,
    text,
    html,
  });
}
