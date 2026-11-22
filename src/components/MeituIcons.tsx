import React from 'react';

interface IconProps {
  className?: string;
}

/** Exact Meitu top centered pill badge logo */
export const MeituBrandPill: React.FC<{ onClick?: () => void; statusDot?: 'loading' | 'found' | 'none' }> = ({
  onClick,
  statusDot = 'none',
}) => (
  <button
    type="button"
    onClick={onClick}
    className="h-6 px-2.5 rounded-full bg-white text-[#111113] flex items-center gap-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.35)] active:scale-95 transition-transform"
  >
    <span className="w-4 h-4 rounded-[5px] bg-gradient-to-br from-[#FF2E63] to-[#FF5E8A] flex items-center justify-center shrink-0">
      <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 text-white" fill="none">
        <path
          d="M2.5 11.2V5.4C2.5 4.9 3.1 4.6 3.5 4.9L5.8 6.8L8 4.8L10.2 6.8L12.5 4.9C12.9 4.6 13.5 4.9 13.5 5.4V11.2"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <span className="text-[12px] font-bold tracking-tight leading-none">meitu</span>
    {statusDot === 'found' && (
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
    )}
    {statusDot === 'loading' && (
      <span className="w-1.5 h-1.5 rounded-full bg-[#FF4F7B] animate-pulse ml-0.5" />
    )}
  </button>
);

/** Exact Meitu bottom-right Split Compare icon `[ | ]` from Screenshots 1 & 2 */
export const MeituCompareIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="3" y="4" width="18" height="16" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 4V20" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 5H17.5C18.88 5 20 6.12 20 7.5V16.5C20 17.88 18.88 19 17.5 19H12V5Z" fill="currentColor" fillOpacity="0.32" />
  </svg>
);

/** Exact Meitu Filter Color Swatch floating icon from Screenshot 1 */
export const MeituSwatchIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M5.5 5.5C5.5 4.4 6.4 3.5 7.5 3.5H10.5C11.6 3.5 12.5 4.4 12.5 5.5V16.5C12.5 18.43 10.93 20 9 20C7.07 20 5.5 18.43 5.5 16.5V5.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M12.5 8.5L16.3 6.3C17.25 5.75 18.47 6.08 19.02 7.03L20.52 9.63C21.07 10.58 20.74 11.8 19.79 12.35L11.5 17.1"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <circle cx="9" cy="16.5" r="1.2" fill="currentColor" />
  </svg>
);

/** Exact Meitu Touch / Face Focus Hand icon from Screenshot 2 */
export const MeituTouchIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M9.5 12.5V6.5C9.5 5.67 10.17 5 11 5C11.83 5 12.5 5.67 12.5 6.5V11M12.5 10.5C12.5 9.67 13.17 9 14 9C14.83 9 15.5 9.67 15.5 10.5V12M15.5 11.2C15.5 10.54 16.04 10 16.7 10C17.36 10 17.9 10.54 17.9 11.2V14.8C17.9 17.9 15.6 20 12.6 20H11.5C9.3 20 7.7 18.7 6.8 16.7L5.3 13.5C4.95 12.75 5.28 11.85 6.03 11.5C6.75 11.16 7.62 11.46 8 12.15L9.5 14.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="11" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.45" />
  </svg>
);

/** Thin monochrome Meitu Beauty & Face Reshape line icons (ZERO emojis!) */
export const FaceSlimIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M6 10C6 6.2 8.7 3.5 12 3.5C15.3 3.5 18 6.2 18 10C18 14.8 15.2 19.5 12 20.5C8.8 19.5 6 14.8 6 10Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M2.5 12.5H5.5M5.5 12.5L4 11M5.5 12.5L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21.5 12.5H18.5M18.5 12.5L20 11M18.5 12.5L20 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const VLineIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M5.5 7C5.5 13 8.5 18.5 12 20.5C15.5 18.5 18.5 13 18.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9.5 16.5L12 19L14.5 16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BigEyeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M2.5 12C4.8 7.8 8.2 6 12 6C15.8 6 19.2 7.8 21.5 12C19.2 16.2 15.8 18 12 18C8.2 18 4.8 16.2 2.5 12Z" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="11" cy="11" r="0.9" fill="currentColor" />
  </svg>
);

export const NoseIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M12 4.5V14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8.5 15.5C7.2 15.8 6.5 16.8 7 17.8C7.5 18.7 9 18.8 10.2 18.2C11.2 17.7 12.8 17.7 13.8 18.2C15 18.8 16.5 18.7 17 17.8C17.5 16.8 16.8 15.8 15.5 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const LipsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M3.5 12.5C6.5 9.2 9.2 9 12 10.8C14.8 9 17.5 9.2 20.5 12.5C17.8 16.2 15.2 17.5 12 17.5C8.8 17.5 6.2 16.2 3.5 12.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M5 12.6C8 13.5 16 13.5 19 12.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const SmileLiftIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M5 13C7.5 16.5 16.5 16.5 19 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M4.5 10.5L6.5 12.5M19.5 10.5L17.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SkinSmoothIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8.5 13.5C9.5 15 11.2 15.5 12.8 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M15 7L15.6 8.6L17.2 9.2L15.6 9.8L15 11.4L14.4 9.8L12.8 9.2L14.4 8.6L15 7Z" fill="currentColor" />
  </svg>
);

export const TeethIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4.5 9.5C4.5 9.5 8 11.5 12 11.5C16 11.5 19.5 9.5 19.5 9.5C19.5 14.5 16.2 17.5 12 17.5C7.8 17.5 4.5 14.5 4.5 9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 11.2V16.8M12 11.5V17.4M15 11.2V16.8" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);
