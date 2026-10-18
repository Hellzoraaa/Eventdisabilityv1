import React from 'react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  showText?: boolean;
  text?: string;
}

/**
 * Centang Biru Resmi (Verified Badge) seperti di YouTube, TikTok, Twitter/X, & Instagram.
 * Menggunakan vektor 12-lobed scalloped starburst rosette berwarna biru dengan tanda centang putih tajam.
 */
export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  className = '',
  title = 'Mitra Resmi Terverifikasi (Kementerian Agama RI)',
  showText = false,
  text = 'Mitra Resmi',
}) => {
  const sizeMap = {
    xs: { icon: 'w-3.5 h-3.5', text: 'text-[10px]' },
    sm: { icon: 'w-4 h-4', text: 'text-[11px]' },
    md: { icon: 'w-5 h-5', text: 'text-[12px]' },
    lg: { icon: 'w-6 h-6', text: 'text-[13px]' },
  };

  return (
    <span
      className={`inline-flex items-center gap-1 align-middle select-none shrink-0 group ${className}`}
      title={title}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeMap[size].icon} shrink-0 text-[#1D9BF0] transition-transform duration-200 group-hover:scale-115 drop-shadow-2xs cursor-pointer`}
      >
        {/* Authentic 12-Point Scalloped Rosette (TikTok & YouTube / Twitter / Meta verified badge) */}
        <path
          d="M10.29 2.308a2.43 2.43 0 0 1 3.42 0l.738.742a2.43 2.43 0 0 0 2.213.685l1.026-.192a2.43 2.43 0 0 1 2.766 2.012l.182 1.027a2.43 2.43 0 0 0 1.368 1.884l.942.446a2.43 2.43 0 0 1 1.057 3.25l-.478.927a2.43 2.43 0 0 0 0 2.322l.478.927a2.43 2.43 0 0 1-1.057 3.25l-.942.446a2.43 2.43 0 0 0-1.368 1.884l-.182 1.027a2.43 2.43 0 0 1-2.766 2.012l-1.026-.192a2.43 2.43 0 0 0-2.213.685l-.738.742a2.43 2.43 0 0 1-3.42 0l-.738-.742a2.43 2.43 0 0 0-2.213-.685l-1.026.192a2.43 2.43 0 0 1-2.766-2.012l-.182-1.027a2.43 2.43 0 0 0-1.368-1.884l-.942-.446a2.43 2.43 0 0 1-1.057-3.25l.478-.927a2.43 2.43 0 0 0 0-2.322l-.478-.927a2.43 2.43 0 0 1 1.057-3.25l.942-.446a2.43 2.43 0 0 0 1.368-1.884l.182-1.027a2.43 2.43 0 0 1 2.766-2.012l1.026.192a2.43 2.43 0 0 0 2.213-.685l.738-.742Z"
          fill="#1D9BF0"
        />
        {/* Crisp Center White Checkmark */}
        <path
          d="M8.2 12.2L10.7 14.7L15.8 9.4"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span className={`font-bold text-[#0284c7] ${sizeMap[size].text}`}>
          {text}
        </span>
      )}
    </span>
  );
};
