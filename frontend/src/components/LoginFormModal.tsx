import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { User, ApplicationSettings } from '../types.ts';
import { ForgotPasswordForm } from './ForgotPasswordForm.tsx';

interface LoginFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  defaultRoleHint?: 'mitra' | 'superadmin' | string;
}

const DEFAULT_SETTINGS: ApplicationSettings = {
  applicationName: "Event for Disability to Qur'an",
  logo: '',
  favicon: '',
  topbarColor: '#0f172a',
  primaryColor: '#334155',
  secondaryColor: '#64748b',
  accentColor: '#10b981',
  publicRoleLabel: 'Login',
  institutionSubtitle: 'Login untuk Mitra dan Super Admin',
  logoSize: '144px',
  headerBgImage: '',
  headerBgOverlay: 'dark',
  logoContainerBg: 'white',
  updatedAt: '',
  updatedBy: '',
};

export const LoginFormModal: React.FC<LoginFormModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  // Tampilan lupa password (OTP lewat email)
  const [showForgot, setShowForgot] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [appSettings, setAppSettings] =
    useState<ApplicationSettings>(DEFAULT_SETTINGS);

  const [settingsLoading, setSettingsLoading] =
    useState(false);

  /**
   * Saat modal dibuka:
   * - form selalu kosong
   * - tidak ada akun default
   * - tidak ada akun demo
   * - logo dan branding diambil dari Application Settings
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEmail('');
    setPassword('');
    setErrorMsg(null);
    setShowPassword(false);
    setShowForgot(false);

    let cancelled = false;

    const loadApplicationSettings = async () => {
      setSettingsLoading(true);

      try {
        const response = await fetch('/api/app-settings', {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'Application Settings tidak dapat dimuat.'
          );
        }

        if (!cancelled && data?.settings) {
          setAppSettings({
            ...DEFAULT_SETTINGS,
            ...data.settings,
          });
        }
      } catch (error) {
        console.error(
          '[Login] Gagal mengambil Application Settings:',
          error
        );

        if (!cancelled) {
          setAppSettings(DEFAULT_SETTINGS);
        }
      } finally {
        if (!cancelled) {
          setSettingsLoading(false);
        }
      }
    };

    loadApplicationSettings();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /**
   * Update favicon dan title berdasarkan Application Settings.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (appSettings.applicationName) {
      document.title = appSettings.applicationName;
    }

    if (appSettings.favicon) {
      let faviconLink =
        document.querySelector<HTMLLinkElement>(
          'link[rel="icon"]'
        );

      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }

      faviconLink.href = appSettings.favicon;
    }
  }, [
    isOpen,
    appSettings.applicationName,
    appSettings.favicon,
  ]);

  if (!isOpen) {
    return null;
  }

  /**
   * LOGIN
   *
   * Frontend tidak pernah mengambil daftar users.
   *
   * Email + password dikirim ke:
   *
   * POST /api/auth/login
   *
   * Backend memeriksa:
   *
   * event_disabilitas_db.users
   */
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('Email wajib diisi.');
      return;
    }

    if (!password) {
      setErrorMsg('Kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        '/api/auth/login',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        }
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (
        response.ok &&
        data?.success &&
        data?.user
      ) {
        setPassword('');

        onLoginSuccess(data.user);
        onClose();

        return;
      }

      setErrorMsg(
        data?.error ||
          'Email atau kata sandi tidak valid.'
      );
    } catch (error) {
      console.error(
        '[Login] Connection error:',
        error
      );

      setErrorMsg(
        'Tidak dapat terhubung ke server. Pastikan server aplikasi dan MySQL sedang aktif.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ukuran logo.
   *
   * Application Settings sekarang menggunakan nilai seperti:
   * 80px
   * 112px
   * 144px
   *
   * Tetap mendukung nilai lama:
   * small
   * medium
   * large
   */
  const getLogoSize = () => {
    const rawSize = String(
      appSettings.logoSize || '144px'
    ).trim();

    if (rawSize === 'small') {
      return 80;
    }

    if (rawSize === 'medium') {
      return 112;
    }

    if (rawSize === 'large') {
      return 144;
    }

    const parsedSize = Number.parseInt(
      rawSize.replace('px', ''),
      10
    );

    if (
      Number.isFinite(parsedSize) &&
      parsedSize > 0
    ) {
      return Math.min(
        Math.max(parsedSize, 40),
        240
      );
    }

    return 144;
  };

  /**
   * Logo utama aplikasi.
   *
   * Sumber:
   * Application Settings -> MySQL
   *
   * Tidak menggunakan:
   * - users
   * - logo hardcode
   * - akun demo
   */
  const renderLogo = () => {
    const logoSize = getLogoSize();

    if (appSettings.logo) {
      return (
        <div
          className="flex items-center justify-center overflow-hidden rounded-2xl"
          style={{
            width: `${logoSize}px`,
            height: `${logoSize}px`,
            backgroundColor:
              appSettings.logoContainerBg ||
              'white',
          }}
        >
          <img
            src={appSettings.logo}
            alt={
              appSettings.applicationName ||
              'Logo aplikasi'
            }
            className="w-full h-full object-contain p-2"
          />
        </div>
      );
    }

    /**
     * Fallback jika database belum mempunyai logo.
     *
     * Ini bukan sumber logo utama.
     */
    return (
      <div
        className="rounded-2xl flex items-center justify-center border border-slate-200 bg-slate-50"
        style={{
          width: `${Math.min(logoSize, 80)}px`,
          height: `${Math.min(logoSize, 80)}px`,
        }}
        aria-label="Logo belum tersedia"
      >
        <Icon name="accessibility" className="text-[40px] text-slate-400" />
      </div>
    );
  };

  /**
   * Background login.
   *
   * Jika Application Settings memiliki background,
   * gunakan background tersebut.
   *
   * Jika belum ada, gunakan background sebelumnya.
   */
  const backgroundImage =
    appSettings.headerBgImage ||
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1600&auto=format&fit=crop';

  const overlayClass =
    appSettings.headerBgOverlay === 'light'
      ? 'bg-white/45'
      : appSettings.headerBgOverlay === 'none'
        ? 'bg-transparent'
        : 'bg-slate-950/75';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center transition-all duration-300"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
        }}
      >
        <div
          className={`absolute inset-0 ${overlayClass} backdrop-blur-sm`}
        />
      </div>

      {/* Login Card */}
      <div
        className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-[420px] overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <Icon name="close" className="text-[20px]" />
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          {settingsLoading ? (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200">
              <span className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            renderLogo()
          )}

          <h2
            id="login-title"
            className="mt-3 text-[19px] sm:text-[21px] font-bold text-slate-900 tracking-tight"
          >
            {appSettings.applicationName ||
              "Event for Disability to Qur'an"}
          </h2>

          <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium mt-1">
            {appSettings.institutionSubtitle ||
              'Login untuk Mitra dan Super Admin'}
          </p>
        </div>

        {/* Error */}
        {errorMsg && !showForgot && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-center gap-2">
            <Icon name="error" className="text-[18px] text-rose-600 shrink-0" />

            <span>{errorMsg}</span>
          </div>
        )}

        {showForgot ? (
          <ForgotPasswordForm
            initialEmail={email}
            onBackToLogin={(backEmail) => {
              if (backEmail) setEmail(backEmail);
              setPassword('');
              setErrorMsg(null);
              setShowForgot(false);
            }}
          />
        ) : (
        <>
        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="sr-only"
            >
              Email
            </label>

            <input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Email address"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="sr-only"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="login-password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Password"
                disabled={isLoading}
                className="w-full pl-4 pr-16 py-3 bg-white border border-slate-300 rounded-xl text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
                }
                disabled={isLoading}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Lupa password */}
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setShowForgot(true);
              }}
              disabled={isLoading}
              className="text-[12px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              Lupa password?
            </button>
          </div>

          {/* Login */}
          <button
            type="submit"
            disabled={
              isLoading ||
              !email.trim() ||
              !password
            }
            className="w-full py-3 bg-[#e2e8f0] hover:bg-[#cbd5e1] text-slate-800 font-bold rounded-xl text-[14px] transition-all duration-150 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>
        </>
        )}

       
        
      </div>
    </div>
  );
};

export default LoginFormModal;