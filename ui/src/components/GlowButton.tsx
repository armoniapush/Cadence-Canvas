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
  speed = '5s',
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

  // Conic gradients for variants
  const getBorderGradient = () => {
    switch (variant) {
      case 'iridescent':
        // Google Ask AI Mode multi-color neon spectrum (amber -> emerald -> cyan -> cobalt -> violet)
        return 'conic-gradient(from 0deg, #f59e0b 0%, #10b981 25%, #06b6d4 50%, #6366f1 75%, #ec4899 90%, #f59e0b 100%)';
      case 'deepthink':
        // DeepThink AI warm amber & radiant violet / blue
        return 'conic-gradient(from 0deg, #f97316 0%, #818cf8 35%, #ec4899 70%, #f97316 100%)';
      case 'aurora':
        // Apple Intelligence / Aurora northern lights
        return 'linear-gradient(90deg, #38bdf8 0%, #818cf8 30%, #ec4899 60%, #34d399 100%)';
      case 'specular':
      case 'subtle':
      default:
        return 'conic-gradient(from 0deg, rgba(255, 255, 255, 0.4) 0%, rgba(129, 140, 248, 0.8) 50%, rgba(255, 255, 255, 0.4) 100%)';
    }
  };

  // Base opacity
  const baseBorderOpacity = active ? 0.95 : isHovered ? 0.85 : 0.35;
  const currentOpacity = glowOpacity !== undefined ? glowOpacity : baseBorderOpacity;

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
        padding: '1px',
        borderRadius: glowRadius,
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transform: 'translateZ(0)',
        transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease',
        boxShadow: active
          ? variant === 'deepthink'
            ? '0 0 16px rgba(249, 115, 22, 0.28), 0 0 32px rgba(129, 140, 248, 0.18)'
            : '0 0 16px rgba(56, 189, 248, 0.28), 0 0 32px rgba(99, 102, 241, 0.18)'
          : isHovered
          ? '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(129, 140, 248, 0.2)'
          : '0 1px 3px rgba(0, 0, 0, 0.3)',
        ...style,
      }}
      {...rest}
    >
      {/* 1. Animated Conic or Fluid Rotating Gradient Border Layer */}
      {(variant === 'iridescent' || variant === 'deepthink') && (
        <div
          className="glow-star-border-spinner"
          style={{
            position: 'absolute',
            inset: '-100%',
            width: '300%',
            height: '300%',
            left: '-100%',
            top: '-100%',
            background: getBorderGradient(),
            animation: `star-movement-linear ${speed} linear infinite`,
            opacity: currentOpacity,
            transition: 'opacity 0.25s ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 2. Fluid Aurora Underglow Wave (Apple Intelligence / Siri style) */}
      {variant === 'aurora' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            borderRadius: glowRadius,
            pointerEvents: 'none',
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
              filter: 'blur(8px)',
              opacity: active ? 0.9 : isHovered ? 0.75 : 0.4,
              animation: 'aurora-wave 6s ease-in-out infinite alternate',
              transition: 'opacity 0.3s ease',
            }}
          />
        </div>
      )}

      {/* 3. Cursor-Following Specular Radial Glow (React Bits Border Glow pattern) */}
      <div
        className="glow-specular-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: glowRadius,
          pointerEvents: 'none',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
          background: `radial-gradient(110px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.28), transparent 70%)`,
        }}
      />

      {/* 4. Dark Matte Inner Core Container */}
      <div
        className={`glow-btn-core ${innerClassName}`}
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          width: '100%',
          height: '100%',
          backgroundColor: active ? '#161922' : '#0d1017',
          borderRadius: `calc(${glowRadius} - 1px)`,
          padding: '6px 12px',
          color: active ? '#ffffff' : '#cbd5e1',
          fontSize: '12px',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          transition: 'background-color 0.15s ease, color 0.15s ease',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        {children}
      </div>
    </button>
  );
};
