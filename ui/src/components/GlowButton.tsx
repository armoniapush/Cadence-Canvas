import React, { useRef, useState } from 'react';

export type GlowButtonVariant = 'iridescent' | 'deepthink' | 'aurora' | 'specular' | 'subtle';

export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlowButtonVariant;
  active?: boolean;
  speed?: string;
  glowRadius?: string;
  glowOpacity?: number;
  innerClassName?: string;
  children: React.ReactNode;
}

/**
 * GlowButton - High-Craft Animated Border & Aurora Glow Component
 * Inspired by React Bits (Border Glow, Star Border, Specular Button, Aurora Glow)
 * Replicates the multi-spectral Google Ask AI Mode, DeepThink AI bar, and Apple Intelligence aurora.
 */
export const GlowButton: React.FC<GlowButtonProps> = ({
  variant = 'iridescent',
  active = false,
  speed = '4.5s',
  glowRadius = '8px',
  glowOpacity,
  innerClassName = '',
  className = '',
  style,
  disabled,
  children,
  onClick,
  ...rest
}) => {
  const containerRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  // Conic gradients for variants with dual harmonic cycles for uniform perimeter presence
  const getBorderGradient = () => {
    switch (variant) {
      case 'iridescent':
        // Authentic Google Gemini / Ask AI multi-spectral spectrum:
        // Google Blue (#4285f4), Gemini Purple (#9b72cb), Coral Red (#ea4335), Warm Amber (#fbbc04), Emerald (#34a853)
        return 'conic-gradient(from 0deg at 50% 50%, #4285f4 0%, #9b72cb 12%, #ea4335 25%, #fbbc04 38%, #34a853 50%, #4285f4 62%, #9b72cb 75%, #ea4335 88%, #34a853 95%, #4285f4 100%)';
      case 'deepthink':
        // DeepThink AI warm amber, radiant magenta & electric violet
        return 'conic-gradient(from 0deg at 50% 50%, #f97316 0%, #ec4899 25%, #818cf8 50%, #f97316 75%, #ec4899 90%, #f97316 100%)';
      case 'aurora':
        // Apple Intelligence / Aurora northern lights
        return 'linear-gradient(90deg, #38bdf8 0%, #818cf8 30%, #ec4899 60%, #34d399 100%)';
      case 'specular':
      case 'subtle':
      default:
        return 'conic-gradient(from 0deg at 50% 50%, rgba(255, 255, 255, 0.4) 0%, rgba(129, 140, 248, 0.8) 50%, rgba(255, 255, 255, 0.4) 100%)';
    }
  };

  // Base opacity
  const baseBorderOpacity = active ? 1.0 : isHovered ? 0.95 : 0.65;
  const currentOpacity = glowOpacity !== undefined ? glowOpacity : baseBorderOpacity;
  void currentOpacity;

  return (
    <button
      ref={containerRef}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`glow-btn-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        borderRadius: glowRadius,
        border: isHovered ? '1px solid rgba(63, 63, 70, 0.7)' : '1px solid rgba(39, 39, 42, 0.8)',
        background: isHovered ? 'rgba(39, 39, 42, 0.4)' : 'rgba(24, 24, 27, 0.4)',
        color: isHovered ? 'var(--zinc-200, #e4e4e7)' : 'var(--zinc-400, #a1a1aa)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transform: 'translateZ(0)',
        transition: 'all 0.15s ease',
        boxShadow: 'none',
        ...style,
      }}
      {...rest}
    >
      {/* 1. Ambient Diffuse Aura Layer: Disabled for clean 2D matte */}
      {(variant === 'iridescent' || variant === 'deepthink') && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '260%',
            aspectRatio: '1 / 1',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            filter: 'none',
            opacity: 0,
            zIndex: 0,
          }}
        >
          <div
            className="glow-star-border-spinner"
            style={{
              width: '100%',
              height: '100%',
              background: getBorderGradient(),
            }}
          />
        </div>
      )}

      {/* 2. Precision Aspect-Ratio Corrected Rotating Perimeter Border: Disabled for clean 2D matte */}
      {(variant === 'iridescent' || variant === 'deepthink') && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '260%',
            aspectRatio: '1 / 1',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            opacity: 0,
            zIndex: 1,
          }}
        >
          <div
            className="glow-star-border-spinner"
            style={{
              width: '100%',
              height: '100%',
              background: getBorderGradient(),
            }}
          />
        </div>
      )}

      {/* 3. Fluid Aurora Underglow Wave (Apple Intelligence / Northern Lights) */}
      {variant === 'aurora' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            borderRadius: glowRadius,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <div
            className="glow-aurora-wave"
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '-20%',
              width: '140%',
              height: '24px',
              background: getBorderGradient(),
              filter: 'none',
              opacity: 0,
              animation: 'none',
              transition: 'opacity 0.3s ease',
            }}
          />
        </div>
      )}

      {/* 4. Cursor-Following Specular Radial Highlight: Disabled for clean 2D matte */}
      <div
        className="glow-specular-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: glowRadius,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.2s ease',
          zIndex: 2,
          background: `radial-gradient(110px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.22), transparent 70%)`,
        }}
      />

      {/* 5. Dark Matte Obsidian Core with Top Specular Sheen */}
      <div
        className={`glow-btn-core ${innerClassName}`}
        style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          width: '100%',
          height: '100%',
          background: 'transparent',
          borderRadius: `calc(${glowRadius} - 1.2px)`,
          padding: '7px 14px',
          color: isHovered ? 'var(--zinc-200, #e4e4e7)' : 'var(--zinc-400, #a1a1aa)',
          fontSize: '12px',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          letterSpacing: 'normal',
          transition: 'all 0.15s ease',
          boxShadow: 'none',
        }}
      >
        {children}
      </div>
    </button>
  );
};
