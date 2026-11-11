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
        // Sci-Fi Underglow: Orange to Transparent to Blue
        return 'linear-gradient(to right, rgba(249, 115, 22, 0.35), transparent 45%, transparent 55%, rgba(59, 130, 246, 0.35))';
      case 'deepthink':
        // DeepThink amber and purple
        return 'linear-gradient(to right, rgba(249, 115, 22, 0.35), transparent, rgba(168, 85, 247, 0.35))';
      case 'cyan-violet':
        return 'linear-gradient(to right, rgba(56, 189, 248, 0.35), transparent, rgba(168, 85, 247, 0.35))';
      case 'monochrome':
      default:
        return 'linear-gradient(to right, rgba(255, 255, 255, 0.2), transparent, rgba(255, 255, 255, 0.2))';
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
        boxSizing: 'border-box',
        isolation: 'isolate',
        ...style,
      }}
      {...rest}
    >
      {/* 1. Ambient Background Glow: Sharp Underglow Aura (Back Layer) */}
      <div
        style={{
          position: 'absolute',
          top: '-1px',
          left: '-1px',
          right: '-1px',
          bottom: '-1px',
          borderRadius,
          background: getGradient(),
          opacity: isHovered ? 0.85 : 0.65,
          filter: 'blur(12px)',
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* 2. Cursor-Tracking Mesh Subtle Highlight */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(${glowSize}px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(255, 255, 255, 0.08), transparent 70%)`,
          opacity: isHovered ? 0.4 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* 3. Base Static 1px Border (Crisp border-white/10) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 4. Interior Dark Solid Surface (#0b0c10 - No text blur) */}
      <div
        className={`border-glow-content ${innerClassName}`}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          backgroundColor: '#0b0c10',
          borderRadius: `calc(${borderRadius} - ${borderWidth}px)`,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};
