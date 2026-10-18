import React from 'react';
import { VerifiedBadge } from './VerifiedBadge.tsx';

interface PartnerLogoProps {
  name?: string;
  logoUrl?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showVerifiedBadge?: boolean;
  isVerified?: boolean;
}

export const PartnerLogo: React.FC<PartnerLogoProps> = ({
  name = 'Yayasan Mitra',
  logoUrl,
  className = '',
  size = 'md',
  showLabel = false,
  showVerifiedBadge = false,
  isVerified = true,
}) => {
  const cleanName = (name || '').trim();
  const lower = cleanName.toLowerCase();

  // Precise sizing classes for responsive containers
  const containerDimensions = {
    xs: 'w-8 h-8 rounded-lg text-[9px] p-0.5',
    sm: 'w-11 h-11 rounded-lg text-[10px] p-1',
    md: 'w-20 sm:w-24 h-14 sm:h-16 rounded-xl text-[11px] p-1.5',
    lg: 'w-28 sm:w-32 h-16 sm:h-20 rounded-xl text-[12px] p-2',
    xl: 'w-36 sm:w-44 h-20 sm:h-24 rounded-2xl text-[13px] p-2.5',
  };

  // 1. If explicit external / uploaded image logo exists
  if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('/') || logoUrl.startsWith('data:'))) {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <div
          className={`relative flex items-center justify-center shrink-0 bg-white border border-slate-200/80 shadow-2xs overflow-hidden transition-all duration-200 hover:border-blue-400 ${containerDimensions[size]} ${className}`}
          title={cleanName}
        >
          <img
            src={logoUrl}
            alt={cleanName}
            className="w-full h-full object-contain p-0.5"
            onError={e => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        {showVerifiedBadge && isVerified && (
          <VerifiedBadge size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
        )}
      </div>
    );
  }

  // 2. Yayasan Amanah Peduli Ummat (Specific user upload: Round blue globe, yellow triangle, star, wheat, Quran)
  if (lower.includes('amanah peduli') || lower.includes('peduli ummat')) {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <div
          className={`flex items-center justify-center bg-white border border-slate-200/90 shadow-2xs shrink-0 select-none overflow-hidden transition-all duration-200 hover:border-blue-400 ${containerDimensions[size]} ${className}`}
          title="Yayasan Amanah Peduli Ummat"
        >
          <img
            src="/assets/logos/amanah-peduli-ummat.svg"
            alt="Yayasan Amanah Peduli Ummat"
            className="w-full h-full object-contain"
          />
        </div>
        {showVerifiedBadge && isVerified && (
          <VerifiedBadge size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
        )}
      </div>
    );
  }

  // 3. amanah BERBAGI (Specific user upload: dynamic running person with red swoosh)
  if (lower.includes('amanah berbagi') || lower.includes('berbagi')) {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <div
          className={`flex items-center justify-center bg-white border border-slate-200/90 shadow-2xs shrink-0 select-none overflow-hidden transition-all duration-200 hover:border-red-400 ${containerDimensions[size]} ${className}`}
          title="amanah BERBAGI"
        >
          <img
            src="/assets/logos/amanah-berbagi.svg"
            alt="amanah BERBAGI"
            className="w-full h-full object-contain"
          />
        </div>
        {showVerifiedBadge && isVerified && (
          <VerifiedBadge size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
        )}
      </div>
    );
  }

  // 4. Inklusi Rumah Kasih (Specific user upload: Magenta house with yellow heart & flower)
  if (lower.includes('rumah kasih') || lower.includes('kasih') || lower.includes('hati') || lower.includes('pelita')) {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <div
          className={`flex items-center justify-center bg-white border border-rose-200/90 shadow-2xs shrink-0 select-none overflow-hidden transition-all duration-200 hover:border-rose-400 ${containerDimensions[size]} ${className}`}
          title={cleanName || 'Inklusi Rumah Kasih'}
        >
          <img
            src="/assets/logos/inklusi-rumah-kasih.svg"
            alt="Inklusi Rumah Kasih"
            className="w-full h-full object-contain"
          />
        </div>
        {showVerifiedBadge && isVerified && (
          <VerifiedBadge size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
        )}
      </div>
    );
  }

  // 5. Yayasan Amanah Bunda (Historical partner)
  if (lower.includes('amanah bunda')) {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <div
          className={`flex items-center gap-2 bg-white border border-emerald-100/90 shadow-2xs shrink-0 select-none overflow-hidden transition-all duration-200 ${containerDimensions[size]} ${className}`}
          title="Yayasan Amanah Bunda"
        >
          <svg viewBox="0 0 160 52" className="w-full h-full object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="26" cy="26" r="22" fill="#ECFDF5" stroke="#10B981" strokeWidth="2.5" />
            <path
              d="M26 13C22 13 18 16 18 20C18 26 26 33 26 33C26 33 34 26 34 20C34 16 30 13 26 13Z"
              fill="#059669"
            />
            <path
              d="M17 29C20 33 23 35 26 35C29 35 32 33 35 29"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="26" cy="20" r="3" fill="#FEF3C7" />
            <text x="56" y="22" fill="#047857" fontFamily="'Segoe UI', sans-serif" fontWeight="900" fontSize="13.5" letterSpacing="-0.3">
              AMANAH
            </text>
            <text x="56" y="36" fill="#D97706" fontFamily="'Segoe UI', sans-serif" fontWeight="800" fontSize="13" letterSpacing="-0.2">
              BUNDA
            </text>
            <text x="56" y="46" fill="#6B7280" fontFamily="'Segoe UI', sans-serif" fontWeight="600" fontSize="7.5" letterSpacing="0.8">
              YAYASAN INKLUSI
            </text>
          </svg>
        </div>
        {showVerifiedBadge && isVerified && (
          <VerifiedBadge size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
        )}
      </div>
    );
  }

  // 6. Yayasan Sahabat Netra Mengaji
  if (lower.includes('sahabat netra')) {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <div
          className={`flex items-center bg-white border border-teal-100/90 shadow-2xs shrink-0 select-none overflow-hidden transition-all duration-200 ${containerDimensions[size]} ${className}`}
          title="Yayasan Sahabat Netra Mengaji"
        >
          <svg viewBox="0 0 160 52" className="w-full h-full object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="6" width="40" height="40" rx="12" fill="#F0FDFA" stroke="#0D9488" strokeWidth="2" />
            <circle cx="17" cy="18" r="3" fill="#0D9488" />
            <circle cx="25" cy="18" r="3" fill="#0D9488" />
            <circle cx="33" cy="18" r="3" fill="#0F766E" />
            <circle cx="17" cy="26" r="3" fill="#0D9488" />
            <circle cx="25" cy="26" r="3" fill="#14B8A6" />
            <circle cx="33" cy="26" r="3" fill="#0D9488" />
            <path d="M16 36C21 34 25 35 25 35C25 35 29 34 34 36" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" />
            <text x="54" y="23" fill="#0F766E" fontFamily="'Segoe UI', sans-serif" fontWeight="900" fontSize="13" letterSpacing="-0.2">
              SAHABAT NETRA
            </text>
            <text x="54" y="37" fill="#0284C7" fontFamily="'Segoe UI', sans-serif" fontWeight="700" fontSize="11.5">
              MENGAJI BRAILLE
            </text>
            <text x="54" y="46" fill="#9CA3AF" fontFamily="'Segoe UI', sans-serif" fontWeight="600" fontSize="7">
              PUSAT QURAN TUNANETRA
            </text>
          </svg>
        </div>
        {showVerifiedBadge && isVerified && (
          <VerifiedBadge size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
        )}
      </div>
    );
  }

  // 7. Komunitas Tuli Mengaji Nusantara
  if (lower.includes('tuli mengaji') || lower.includes('tunarungu')) {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <div
          className={`flex items-center bg-white border border-blue-100/90 shadow-2xs shrink-0 select-none overflow-hidden transition-all duration-200 ${containerDimensions[size]} ${className}`}
          title="Komunitas Tuli Mengaji Nusantara"
        >
          <svg viewBox="0 0 160 52" className="w-full h-full object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="6" width="40" height="40" rx="12" fill="#EFF6FF" stroke="#2563EB" strokeWidth="2" />
            <path d="M16 32V24C16 22 18 20 20 20C22 20 23 21 24 23V18C24 16.5 25.5 15.5 27 15.5C28.5 15.5 30 16.5 30 18V24" stroke="#1D4ED8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M30 22C30 20.5 31.5 19.5 33 19.5C34.5 19.5 35 20.5 35 22V30C35 34 31 38 26 38C21 38 16 35 16 32" stroke="#1D4ED8" strokeWidth="2.2" strokeLinecap="round" />
            <text x="54" y="23" fill="#1D4ED8" fontFamily="'Segoe UI', sans-serif" fontWeight="900" fontSize="13" letterSpacing="-0.2">
              TULI MENGAJI
            </text>
            <text x="54" y="37" fill="#4338CA" fontFamily="'Segoe UI', sans-serif" fontWeight="700" fontSize="11">
              NUSANTARA
            </text>
            <text x="54" y="46" fill="#9CA3AF" fontFamily="'Segoe UI', sans-serif" fontWeight="600" fontSize="7">
              QURAN BAHASA ISYARAT
            </text>
          </svg>
        </div>
        {showVerifiedBadge && isVerified && (
          <VerifiedBadge size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
        )}
      </div>
    );
  }

  // 8. Generic Institution Dynamic Emblem
  const words = cleanName.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'QM';
  const hue = Math.abs(cleanName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <div
        className={`flex items-center bg-white border border-slate-200/90 shadow-2xs shrink-0 select-none overflow-hidden transition-all duration-200 ${containerDimensions[size]} ${className}`}
        title={cleanName}
      >
        <div
          className="w-full h-full rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow-2xs select-none"
          style={{ backgroundColor: `hsl(${hue}, 65%, 42%)` }}
        >
          <span className="font-extrabold tracking-tight">{initials}</span>
        </div>
      </div>
      {showVerifiedBadge && isVerified && (
        <VerifiedBadge size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
      )}
    </div>
  );
};
