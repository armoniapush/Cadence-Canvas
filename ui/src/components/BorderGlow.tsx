import React, { useRef, useState } from 'react';

export interface BorderGlowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: string;
  glowSize?: number;
  borderRadius?: string;
  variant?: 'rainbow' | 'deepthink' | 'cyan-violet' | 'monochrome';
  className?: string;
  innerClassName?: string;
  borderWidth?: number;
}

/**
 * BorderGlow - React Bits Container Wrapper with Cursor-Tracking Specular Edge
 * Produces the luminous glowing edge seen in Google Ask AI Mode, DeepThink omnibars, and luxury dark mode cards.
 */
export const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  glowColor,
  glowSize = 250,
  borderRadius = '12px',
  variant = 'rainbow',
  className = '',
  innerClassName = '',
  borderWidth = 1,
  style,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--glow-x', `${x}px`);
    containerRef.current.style.setProperty('--glow-y', `${y}px`);
  };

  const getGradient = () => {
    if (glowColor) return glowColor;
    switch (variant) {
      case 'rainbow':
        // Google Ask AI Mode rainbow neon
        return 'linear-gradient(135deg, rgba(245, 158, 11, 0.7), rgba(16, 185, 129, 0.7), rgba(56, 189, 248, 0.7), rgba(129, 140, 248, 0.7), rgba(236, 72, 153, 0.7))';
      case 'deepthink':
        // DeepThink amber and purple
        return 'linear-gradient(135deg, rgba(249, 115, 22, 0.8), rgba(168, 85, 247, 0.8), rgba(56, 189, 248, 0.8))';
      case 'cyan-violet':
        return 'linear-gradient(135deg, rgba(56, 189, 248, 0.8), rgba(168, 85, 247, 0.8))';
      case 'monochrome':
      default:
        return 'radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(129, 140, 248, 0.4) 50%, transparent 80%)';
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`border-glow-wrapper ${className}`}
      style={{
        position: 'relative',
        borderRadius,
        padding: `${borderWidth}px`,
        overflow: 'hidden',
        boxSizing: 'border-box',
        isolation: 'isolate',
        ...style,
      }}
      {...rest}
    >
      {/* 1. Ambient Background Glow (diffuse neon halo outside the card) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: getGradient(),
          opacity: isHovered ? 0.35 : 0.15,
          filter: 'blur(12px)',
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}
      />

      {/* 2. Cursor-Tracking Mesh Glow (React Bits pattern) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(${glowSize}px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${
            variant === 'rainbow'
              ? 'rgba(56, 189, 248, 0.9), rgba(236, 72, 153, 0.7), rgba(245, 158, 11, 0.5)'
              : variant === 'deepthink'
              ? 'rgba(249, 115, 22, 0.9), rgba(168, 85, 247, 0.7)'
              : 'rgba(255, 255, 255, 0.8)'
          }, transparent 70%)`,
          opacity: isHovered ? 1 : 0.45,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
        }}
      />

      {/* 3. Base Static Border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: getGradient(),
          opacity: 0.2,
          pointerEvents: 'none',
        }}
      />

      {/* 4. Interior Dark Matte Body */}
      <div
        className={`border-glow-content ${innerClassName}`}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          backgroundColor: '#0c0e14',
          borderRadius: `calc(${borderRadius} - ${borderWidth}px)`,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};
