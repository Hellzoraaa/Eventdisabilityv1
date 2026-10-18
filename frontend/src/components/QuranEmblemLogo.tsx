import React from 'react';

interface QuranEmblemLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  subtextColor?: string;
  className?: string;
}

export const QuranEmblemLogo: React.FC<QuranEmblemLogoProps> = ({
  size = 'md',
  showText = false,
  textColor = 'text-slate-900',
  subtextColor = 'text-slate-500',
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-[13px]', sub: 'text-[10px]' },
    md: { box: 'w-10 h-10', text: 'text-[15px]', sub: 'text-[11px]' },
    lg: { box: 'w-14 h-14', text: 'text-[18px]', sub: 'text-[12px]' },
    xl: { box: 'w-20 h-20', text: 'text-[22px]', sub: 'text-[13px]' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Golden Arabic Medallion */}
      <div className={`relative ${currentSize.box} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_2px_4px_rgba(202,138,4,0.25)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="goldGradientBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="55%" stopColor="#fef3c7" />
              <stop offset="85%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>
            <linearGradient id="goldBorderRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="70%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
            <linearGradient id="calligraphyColor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
          </defs>

          {/* Outer Sunburst / Petal Ring Pattern */}
          <circle cx="50" cy="50" r="48" fill="url(#goldGradientBg)" stroke="url(#goldBorderRing)" strokeWidth="2.5" />
          
          {/* Inner Decorative Scalloped Circle */}
          <circle cx="50" cy="50" r="41" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.85" />
          <circle cx="50" cy="50" r="38" fill="#ffffff" fillOpacity="0.4" stroke="#b45309" strokeWidth="1.2" />

          {/* Symmetrical Arabic Calligraphy & Quranic Mushaf Crest */}
          <g transform="translate(50, 48) scale(0.72)">
            {/* Arabic 'Iqra' / Quran Calligraphic Stylization */}
            {/* Crown & Crescent Noor Top */}
            <path
              d="M-4,-24 C-1,-28 1,-28 4,-24 C6,-19 2,-16 0,-14 C-2,-16 -6,-19 -4,-24 Z"
              fill="url(#calligraphyColor)"
            />
            {/* Open Book Wings / Calligraphy Strokes */}
            <path
              d="M-22,-4 C-14,-16 -4,-12 0,-3 C4,-12 14,-16 22,-4 C26,2 18,12 8,14 C2,15 1,12 0,10 C-1,12 -2,15 -8,14 C-18,12 -26,2 -22,-4 Z"
              fill="url(#calligraphyColor)"
            />
            {/* Inner Arabic Flourish */}
            <path
              d="M-10,4 C-5,8 -2,12 0,18 C2,12 5,8 10,4 C14,8 11,16 6,18 C1,20 -1,20 -6,18 C-11,16 -14,8 -10,4 Z"
              fill="#d97706"
              opacity="0.9"
            />
            {/* Ayah Marker Dots */}
            <circle cx="0" cy="-6" r="2.2" fill="#d97706" />
            <circle cx="-12" cy="0" r="1.8" fill="#b45309" />
            <circle cx="12" cy="0" r="1.8" fill="#b45309" />
          </g>

          {/* Bottom Star Accent */}
          <polygon points="50,83 52,87 56,87 53,89.5 54,93.5 50,91 46,93.5 47,89.5 44,87 48,87" fill="#b45309" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <span className={`font-bold tracking-tight leading-tight truncate ${currentSize.text} ${textColor}`}>
            Event for Disability to Qur'an
          </span>
          <span className={`font-medium tracking-normal leading-tight truncate ${currentSize.sub} ${subtextColor}`}>
            Platform Pelatihan Inklusif Nusantara
          </span>
        </div>
      )}
    </div>
  );
};
