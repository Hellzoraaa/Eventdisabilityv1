import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon.tsx';
import { User, ApplicationSettings } from '../types.ts';

interface HeaderProps {
  activeView:
    | 'map'
    | 'events'
    | 'mitra'
    | 'superadmin'
    | 'laravel_docs'
    | 'users'
    | 'reports'
    | 'manage_events'
    | 'manage_tpq'
    | 'approvals'
    | 'participants'
    | 'disabilities'
    | 'settings';
  currentUser: User | null;
  appSettings?: ApplicationSettings;
  selectedPeriod?: string;
  onChangePeriod?: (period: string) => void;
  onNavigate: (view: any) => void;
  onOpenLogin: (roleHint?: 'mitra' | 'superadmin') => void;
  onLogout: () => void;
  onOpenLogs: () => void;
  onOpenChangePassword?: () => void;
  unreadLogsCount?: number;
  onToggleMobileMenu?: () => void;
}

const PERIOD_OPTIONS = [
  '1 Bulan Terakhir',
  '3 Bulan Terakhir',
  '6 Bulan Terakhir',
  '1 Tahun Terakhir',
  'Semua Periode',
];

const getInitials = (name: string) => {
  const words = String(name || 'Pengguna')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

export const Header: React.FC<HeaderProps> = ({
  activeView,
  currentUser,
  appSettings,
  selectedPeriod = '6 Bulan Terakhir',
  onChangePeriod,
  onNavigate,
  onOpenLogin,
  onLogout,
  onOpenLogs,
  onOpenChangePassword,
  unreadLogsCount = 0,
  onToggleMobileMenu,
}) => {
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // Props ini tetap dipertahankan agar kompatibel dengan App.tsx versi sekarang.
  void onNavigate;
  void onOpenLogs;
  void onOpenChangePassword;
  void unreadLogsCount;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getHeaderTitle = () => {
    switch (activeView) {
      case 'superadmin':
        return 'Beranda: Event For Disability to Qur\'an';
      case 'mitra':
        return 'Beranda: Event For Disability to Qur\'an';
      case 'map':
        return 'Dashboard Peta Mitra & Yayasan';
      case 'events':
        return 'Beranda: Event Pelatihan & Peta Mitra & Yayasan';
      case 'manage_events':
        return 'Kelola Event';
      case 'manage_tpq':
        return 'Kelola Pendidikan TPQ';
      case 'approvals':
        return 'Persetujuan Pengajuan';
      case 'participants':
        return 'Data & Manajemen Peserta';
      case 'disabilities':
        return 'Kelola Disabilitas';
      case 'users':
        return 'Manajemen User & Mitra';
      case 'reports':
        return 'Laporan & Statistik Sistem';
      case 'settings':
        return 'Application Setting';
      default:
        return 'Beranda: Event For Disability to Qur\'an';
    }
  };

  const roleLabel = currentUser?.role === 'superadmin' ? 'Super Admin' : 'Mitra';
  const initials = currentUser ? getInitials(currentUser.name) : 'U';

  return (
    <header
      className="sticky top-0 z-40 w-full shrink-0 bg-[#1e293b] text-white flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-slate-700/60 shadow-md transition-colors"
      style={{
        backgroundColor: appSettings?.topbarColor || undefined,
      }}
    >
      {/* Title & Mobile Menu Hamburger & Logo */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 -ml-1 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Buka Menu Navigasi"
          title="Buka Menu Navigasi"
        >
          <Icon name="menu" className="text-[22px]" />
        </button>

        {/* Brand Logo in Navbar */}
        {appSettings?.logo ? (
          <img
            src={appSettings.logo}
            alt={appSettings.applicationName || 'Logo'}
            className="w-8 h-8 object-contain rounded-lg shrink-0 bg-white/10 p-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-sky-400">
            <Icon name="menu_book" className="text-[19px]" />
          </div>
        )}

        <h1 className="text-[14px] sm:text-[17px] font-bold text-white tracking-tight truncate">
          {getHeaderTitle()}
        </h1>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Period dropdown (Super Admin) */}
        {activeView === 'superadmin' && (
          <div className="relative" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[12px] font-medium transition-colors cursor-pointer border border-slate-700"
              title="Pilih Rentang Waktu Data"
            >
              <Icon name="calendar_today" className="text-[17px] text-sky-400" />
              <span className="hidden sm:inline">{selectedPeriod}</span>
              <Icon name={isPeriodDropdownOpen ? 'expand_less' : 'expand_more'} className="text-[15px]" />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-[12px]">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Pilih Periode:
                </div>
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      onChangePeriod?.(opt);
                      setIsPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer ${
                      selectedPeriod === opt ? 'font-bold text-[#0284c7] bg-sky-50' : 'text-slate-700'
                    }`}
                  >
                    <span>{opt}</span>
                    {selectedPeriod === opt && (
                      <Icon name="check" className="text-[15px] text-[#0284c7]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Profile - dibuat lebih besar dan menjadi fokus utama */}
        {!currentUser ? (
          <button
            type="button"
            onClick={() => onOpenLogin()}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors rounded-xl cursor-pointer shadow-sm"
          >
            <Icon name="login" className="text-[19px]" />
            <span>Masuk Akun</span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 pl-2 sm:ml-1 sm:border-l border-white/20">
            <div
              className="flex items-center gap-3 px-3 sm:px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-sm transition-all min-w-0"
              title={`Masuk sebagai ${currentUser.name} (${roleLabel})`}
            >
              {/* Avatar lebih besar */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-white text-[#047857] border-2 border-white/70 shadow-md flex items-center justify-center font-extrabold text-[12px] sm:text-[13px] shrink-0">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={`Foto profil ${currentUser.name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Informasi user lebih besar */}
              <div className="hidden sm:flex flex-col justify-center min-w-0 leading-tight">
                <span className="text-[13px] sm:text-[14px] font-bold text-white truncate max-w-[150px] lg:max-w-[210px]">
                  {currentUser.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    {roleLabel}
                  </span>
                  {currentUser.organizationName && currentUser.role === 'mitra' && (
                    <span className="hidden lg:inline text-[10px] text-white/50 truncate max-w-[110px]">
                      • {currentUser.organizationName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Logout tetap tersedia */}
            <button
              type="button"
              onClick={onLogout}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl text-white/80 hover:bg-rose-900/50 hover:text-white transition-colors cursor-pointer border border-white/10 hover:border-rose-500/50"
              title="Keluar Akun"
              aria-label="Keluar Akun"
            >
              <Icon name="logout" className="text-[20px] sm:text-[21px]" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
