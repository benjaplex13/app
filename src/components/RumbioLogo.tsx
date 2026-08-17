import React from 'react';

export type LogoConcept = 'growth-compass' | 'cardinal-coin' | 'flow-arrow' | 'prism';
export type LogoVariant = 'icon' | 'horizontal' | 'monochrome-white' | 'monochrome-dark';

interface RumbioLogoProps {
  concept?: LogoConcept;
  variant?: LogoVariant;
  size?: number;
  className?: string;
  id?: string;
  showTagline?: boolean;
}

export const RumbioLogo: React.FC<RumbioLogoProps> = ({
  concept = 'growth-compass',
  variant = 'horizontal',
  size = 36,
  className = '',
  id,
  showTagline = false,
}) => {
  // Determine color palette based on variant
  const isMonoWhite = variant === 'monochrome-white';
  const isMonoDark = variant === 'monochrome-dark';

  const primaryColor = isMonoWhite ? '#FFFFFF' : isMonoDark ? '#0A192F' : '#2563EB'; // Cobalt / Electric Blue
  const accentColor = isMonoWhite ? '#E2E8F0' : isMonoDark ? '#1E293B' : '#06B6D4'; // Cyan / Sky Blue
  const ringColor = isMonoWhite ? '#FFFFFF' : isMonoDark ? '#0A192F' : '#3B82F6';
  const textColor = isMonoWhite ? '#FFFFFF' : isMonoDark ? '#0A192F' : '#FFFFFF';
  const tagColor = isMonoWhite ? '#94A3B8' : isMonoDark ? '#64748B' : '#38BDF8';

  // Render SVG Symbol based on selected concept
  const renderSymbol = () => {
    switch (concept) {
      case 'growth-compass':
        // Concept 1 (Primary): Minimalist compass ring with 45° upward financial growth arrow & coin notch
        return (
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            {/* Outer Coin / Compass Geometry Ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke={ringColor}
              strokeWidth="6"
              strokeDasharray="210 20"
              strokeLinecap="round"
              opacity={isMonoWhite || isMonoDark ? '1' : '0.9'}
            />

            {/* Inner Sub-arc (Coin Rim Depth) */}
            <circle
              cx="50"
              cy="50"
              r="34"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeDasharray="40 180"
              strokeLinecap="round"
              opacity={isMonoWhite || isMonoDark ? '0.7' : '0.6'}
            />

            {/* West & South Cardinal Accent Dots */}
            <circle cx="16" cy="50" r="3" fill={accentColor} />
            <circle cx="50" cy="84" r="3" fill={accentColor} />

            {/* Dual-Faceted Compass Needle / Upward Growth Arrow pointing Northeast (45°) */}
            {/* Left/Upper facet (Primary Blue) */}
            <path
              d="M 50 50 L 29 63 L 73 27 Z"
              fill={primaryColor}
            />
            {/* Right/Lower facet (Cyan / Accent Blue - gives fintech depth) */}
            <path
              d="M 50 50 L 73 27 L 63 71 Z"
              fill={accentColor}
            />

            {/* Center Pivot / Currency Core */}
            <circle cx="50" cy="50" r="5.5" fill="#FFFFFF" />
            <circle cx="50" cy="50" r="3" fill={primaryColor} />
          </svg>
        );

      case 'cardinal-coin':
        // Concept 2: Geometric Coin Disc with Cardinal Navigation Inset
        return (
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            {/* Solid Coin Disc with border */}
            <circle cx="50" cy="50" r="44" stroke={primaryColor} strokeWidth="6" />
            <circle cx="50" cy="50" r="36" stroke={accentColor} strokeWidth="2" opacity="0.5" />

            {/* 4 Cardinal points */}
            <path
              d="M 50 14 L 54 38 L 50 34 L 46 38 Z"
              fill={accentColor}
            />
            <path
              d="M 86 50 L 62 54 L 66 50 L 62 46 Z"
              fill={accentColor}
            />
            <path
              d="M 50 86 L 46 62 L 50 66 L 54 62 Z"
              fill={accentColor}
              opacity="0.6"
            />
            <path
              d="M 14 50 L 38 46 L 34 50 L 38 54 Z"
              fill={accentColor}
              opacity="0.6"
            />

            {/* Dynamic 45-degree Financial Arrow */}
            <path
              d="M 36 64 L 64 36 M 64 36 H 48 M 64 36 V 52"
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'flow-arrow':
        // Concept 3: Currency Flow Vortex meeting North Compass
        return (
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            {/* Top right flowing exchange arc */}
            <path
              d="M 22 50 C 22 28 38 12 60 12 C 78 12 90 26 88 44"
              stroke={primaryColor}
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* Bottom left counter exchange arc */}
            <path
              d="M 78 50 C 78 72 62 88 40 88 C 22 88 10 74 12 56"
              stroke={accentColor}
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Precision central upward diamond / compass needle */}
            <polygon
              points="50,22 68,50 50,42 32,50"
              fill={primaryColor}
            />
            <polygon
              points="50,78 32,50 50,58 68,50"
              fill={accentColor}
            />
            <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
          </svg>
        );

      case 'prism':
        // Concept 4: Faceted Modern Geometric Star
        return (
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <circle cx="50" cy="50" r="44" stroke={primaryColor} strokeWidth="4" strokeDasharray="6 6" />
            {/* North Point */}
            <polygon points="50,12 50,50 38,40" fill={primaryColor} />
            <polygon points="50,12 50,50 62,40" fill={accentColor} />
            {/* East Point */}
            <polygon points="88,50 50,50 60,38" fill={accentColor} />
            <polygon points="88,50 50,50 60,62" fill={primaryColor} opacity="0.8" />
            {/* South Point */}
            <polygon points="50,88 50,50 62,60" fill={primaryColor} opacity="0.6" />
            <polygon points="50,88 50,50 38,60" fill={accentColor} opacity="0.6" />
            {/* West Point */}
            <polygon points="12,50 50,50 40,62" fill={accentColor} opacity="0.8" />
            <polygon points="12,50 50,50 40,38" fill={primaryColor} />
            {/* Center Dot */}
            <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
          </svg>
        );
    }
  };

  // If icon-only variant
  if (variant === 'icon' || variant === 'monochrome-white' || variant === 'monochrome-dark') {
    return (
      <div id={id} className={`inline-flex items-center justify-center ${className}`}>
        {renderSymbol()}
      </div>
    );
  }

  // Horizontal variant (Icon + Wordmark)
  return (
    <div id={id} className={`inline-flex items-center space-x-3 select-none ${className}`}>
      {renderSymbol()}
      <div className="flex flex-col justify-center">
        <div className="flex items-center">
          <span
            className="font-display font-extrabold tracking-tight"
            style={{
              fontSize: `${Math.max(16, Math.round(size * 0.65))}px`,
              lineHeight: 1,
              color: textColor,
            }}
          >
            Rumbio
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full ml-1"
            style={{ backgroundColor: accentColor }}
          />
        </div>
        {showTagline && (
          <span
            className="text-[9px] uppercase tracking-widest font-semibold mt-0.5"
            style={{ color: tagColor }}
          >
            Travel Finance
          </span>
        )}
      </div>
    </div>
  );
};
