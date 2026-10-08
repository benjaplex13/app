import React from 'react';

export type LogoConcept = 'growth-compass' | 'cardinal-coin' | 'flow-arrow' | 'prism';
export type LogoVariant = 'icon' | 'horizontal' | 'monochrome-white' | 'monochrome-dark' | '3d-badge';

interface RumbioLogoProps {
  concept?: LogoConcept;
  variant?: LogoVariant;
  size?: number;
  className?: string;
  id?: string;
  showTagline?: boolean;
}

/**
 * Official Rumbio 2D Isotype & Wordmark
 * Colors: Turquesa #33C7C7, Azul Oscuro #0A2F5E, Dorado #C8A14D
 */
export const RumbioLogo2D: React.FC<{
  size?: number;
  className?: string;
  showWordmark?: boolean;
  monochrome?: 'white' | 'dark' | null;
}> = ({ size = 36, className = '', showWordmark = false, monochrome = null }) => {
  const turquoiseColor = monochrome === 'white' ? '#FFFFFF' : monochrome === 'dark' ? '#0A2F5E' : '#33C7C7';
  const navyColor = monochrome === 'white' ? '#FFFFFF' : monochrome === 'dark' ? '#0A2F5E' : '#0A2F5E';
  const goldColor = monochrome === 'white' ? '#FFFFFF' : monochrome === 'dark' ? '#0A2F5E' : '#C8A14D';
  const textColor = monochrome === 'white' ? '#FFFFFF' : monochrome === 'dark' ? '#0A2F5E' : '#FFFFFF';

  if (!showWordmark) {
    // Isotype only
    return (
      <svg
        viewBox="0 0 320 320"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`flex-shrink-0 ${className}`}
      >
        {/* 1. Dark Blue Lower Curve Leg */}
        <path
          d="M 120 185 C 120 220 135 250 160 270 C 180 286 210 292 235 272"
          stroke={navyColor}
          strokeWidth="36"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 2. Main Turquoise 'R' Route */}
        <path
          d="M 28 40 L 140 40 C 185 40 225 72 225 118 C 225 160 190 192 145 192 C 100 192 70 225 70 270 C 70 295 90 315 115 315"
          stroke={turquoiseColor}
          strokeWidth="36"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Upper Bowl Location Pin with Waypoint Route */}
        <path d="M 205 95 C 190 95 175 95 155 95" stroke={turquoiseColor} strokeWidth="6" strokeLinecap="round" />
        <circle cx="205" cy="95" r="7" fill={turquoiseColor} />

        <g transform="translate(145, 55)">
          <path
            d="M 16 0 C 7.2 0 0 7.2 0 16 C 0 27 16 44 16 44 C 16 44 32 27 32 16 C 32 7.2 24.8 0 16 0 Z"
            fill={navyColor}
          />
          <circle cx="16" cy="15" r="5.5" fill="#FFFFFF" />
        </g>

        {/* 4. Gold Destination Location Pin */}
        <g transform="translate(208, 185)">
          <path
            d="M 20 0 C 9 0 0 9 0 20 C 0 34 20 54 20 54 C 20 54 40 34 40 20 C 40 9 31 0 20 0 Z"
            fill={goldColor}
          />
          <circle cx="20" cy="19" r="8" fill="#FFFFFF" fillOpacity="0.3" />
          <circle cx="23" cy="18" r="6.5" fill={goldColor} />
        </g>
      </svg>
    );
  }

  // Full 2D logo with wordmark
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <RumbioLogo2D size={size} monochrome={monochrome} />
      <span
        style={{ color: textColor }}
        className="font-extrabold font-display tracking-tight text-xl sm:text-2xl select-none"
      >
        Rumbio
      </span>
    </div>
  );
};

/**
 * Official Rumbio 3D Premium Logo
 * Features depth relief, ambient occlusions, specular gloss and rich bevels
 */
export const RumbioLogo3D: React.FC<{
  size?: number;
  className?: string;
  showWordmark?: boolean;
}> = ({ size = 64, className = '', showWordmark = true }) => {
  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox="0 0 400 480"
        width={size}
        height={Math.round(size * 1.2)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-xl flex-shrink-0"
      >
        <defs>
          <linearGradient id="comp3dTurquoise" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#66E2E2" />
            <stop offset="40%" stopColor="#33C7C7" />
            <stop offset="85%" stopColor="#1E9E9E" />
            <stop offset="100%" stopColor="#126868" />
          </linearGradient>

          <linearGradient id="comp3dDarkBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#184888" />
            <stop offset="45%" stopColor="#0A2F5E" />
            <stop offset="90%" stopColor="#051C3A" />
            <stop offset="100%" stopColor="#020E20" />
          </linearGradient>

          <linearGradient id="comp3dGold" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#E8CA7C" />
            <stop offset="45%" stopColor="#C8A14D" />
            <stop offset="90%" stopColor="#967226" />
            <stop offset="100%" stopColor="#634A14" />
          </linearGradient>

          <linearGradient id="comp3dWordmark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#33C7C7" />
            <stop offset="100%" stopColor="#0A2F5E" />
          </linearGradient>

          <filter id="compShadow3DSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>

        <g transform="translate(45, 20)" filter="url(#compShadow3DSoft)">
          {/* Dark Blue Under-curve 3D */}
          <path
            d="M 120 185 C 120 220 135 250 160 270 C 180 286 210 292 235 272"
            stroke="url(#comp3dDarkBlue)"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 124 185 C 124 216 137 244 160 262 C 178 277 204 284 228 266"
            stroke="#4A7BC7"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />

          {/* Turquoise 3D Route */}
          <path
            d="M 28 40 L 140 40 C 185 40 225 72 225 118 C 225 160 190 192 145 192 C 100 192 70 225 70 270 C 70 295 90 315 115 315"
            stroke="url(#comp3dTurquoise)"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 38 40 L 138 40 C 176 40 210 68 210 116 C 210 152 178 180 142 180 C 108 180 82 208 82 255 C 82 278 98 298 116 298"
            stroke="#188C8C"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M 30 35 L 138 35 C 182 35 220 66 220 114"
            stroke="#B8F7F7"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />

          {/* Upper Bowl Navy 3D Pin */}
          <g transform="translate(145, 55)">
            <path
              d="M 16 0 C 7.2 0 0 7.2 0 16 C 0 27 16 44 16 44 C 16 44 32 27 32 16 C 32 7.2 24.8 0 16 0 Z"
              fill="url(#comp3dDarkBlue)"
            />
            <circle cx="16" cy="15" r="5.5" fill="#FFFFFF" opacity="0.9" />
          </g>

          {/* Lower Right Gold 3D Pin */}
          <g transform="translate(208, 185)">
            <path
              d="M 20 0 C 9 0 0 9 0 20 C 0 34 20 54 20 54 C 20 54 40 34 40 20 C 40 9 31 0 20 0 Z"
              fill="url(#comp3dGold)"
            />
            <circle cx="20" cy="19" r="8.5" fill="#583F0D" opacity="0.35" />
            <circle cx="19.5" cy="18.5" r="7.5" fill="#F0CE7A" />
            <circle cx="22" cy="18" r="6" fill="#C8A14D" />
          </g>
        </g>

        {showWordmark && (
          <g transform="translate(200, 420)">
            <text
              textAnchor="middle"
              fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"
              fontSize="68"
              fontWeight="800"
              letterSpacing="-1.5"
              fill="#FFFFFF"
            >
              Rumbio
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * Universal RumbioLogo component with full backwards-compatibility
 */
export const RumbioLogo: React.FC<RumbioLogoProps> = ({
  concept = 'growth-compass',
  variant = 'horizontal',
  size = 36,
  className = '',
  id,
  showTagline = false,
}) => {
  const isIconOnly = variant === 'icon';
  const isMonoWhite = variant === 'monochrome-white';
  const isMonoDark = variant === 'monochrome-dark';

  return (
    <div id={id} className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      {/* 2D Official Vector Isotype */}
      <RumbioLogo2D
        size={size}
        monochrome={isMonoWhite ? 'white' : isMonoDark ? 'dark' : null}
      />

      {/* Horizontal Wordmark (Rendered when variant is not 'icon') */}
      {!isIconOnly && (
        <div className="flex flex-col">
          <span
            className={`font-black font-display tracking-tight text-lg sm:text-xl leading-none ${
              isMonoWhite ? 'text-white' : isMonoDark ? 'text-[#0A2F5E]' : 'text-white'
            }`}
          >
            Rumbio<span className="text-[#33C7C7]">.</span>
          </span>
          {showTagline && (
            <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
              Finanzas de Viaje
            </span>
          )}
        </div>
      )}
    </div>
  );
};
