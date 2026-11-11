import { useEffect, useRef } from 'react';
import { FileEdit, Type, Link2, Copy, Scissors, Trash2 } from 'lucide-react';
import type { Scene } from '../types';

export interface ContextMenuProps {
  x: number;
  y: number;
  scene: Scene;
  onClose: () => void;
  onOpenEditor: (scene: Scene) => void;
  onRename?: (scene: Scene) => void;
  onStartConnect: (scene: Scene) => void;
  onDuplicate: (scene: Scene) => void;
  onSplit: (scene: Scene) => void;
  onDelete: (sceneId: string) => void;
}

export function ContextMenu({
  x,
  y,
  scene,
  onClose,
  onOpenEditor,
  onRename,
  onStartConnect,
  onDuplicate,
  onSplit,
  onDelete,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Clamp positioning so the menu doesn't overflow screen boundaries
  const menuWidth = 224;
  const menuHeight = 220;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 12);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 12);

  return (
    <div
      ref={menuRef}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        width: `${menuWidth}px`,
        backgroundColor: '#13161c',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '6px',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.5)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'modalFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header with Scene Title */}
      <div
        style={{
          padding: '6px 8px 6px 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#94a3b8',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          marginBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: '-0.01em',
        }}
      >
        {scene.title}
      </div>

      {/* 1. Open Editor */}
      <button
        className="menu-item-btn"
        onClick={() => {
          onOpenEditor(scene);
          onClose();
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileEdit size={14} strokeWidth={1.5} style={{ opacity: 0.8 }} />
          <span>Abrir en Editor</span>
        </span>
        <span className="kbd-shortcut">↵</span>
      </button>

      {/* Rename Scene Inline */}
      {onRename && (
        <button
          className="menu-item-btn"
          onClick={() => {
            onRename(scene);
            onClose();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Type size={14} strokeWidth={1.5} style={{ opacity: 0.8 }} />
            <span>Editar Título en Canvas</span>
          </span>
          <span className="kbd-shortcut">2x Clic</span>
        </button>
      )}

      {/* 2. Connect Causally */}
      <button
        className="menu-item-btn"
        onClick={() => {
          onStartConnect(scene);
          onClose();
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link2 size={14} strokeWidth={1.5} style={{ opacity: 0.8 }} />
          <span>Conectar Causalmente</span>
        </span>
        <span className="kbd-shortcut">⌘L</span>
      </button>

      {/* 3. Duplicate */}
      <button
        className="menu-item-btn"
        onClick={() => {
          onDuplicate(scene);
          onClose();
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Copy size={14} strokeWidth={1.5} style={{ opacity: 0.8 }} />
          <span>Duplicar Escena</span>
        </span>
        <span className="kbd-shortcut">⌘D</span>
      </button>

      {/* 4. Split Scene */}
      <button
        className="menu-item-btn"
        onClick={() => {
          onSplit(scene);
          onClose();
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scissors size={14} strokeWidth={1.5} style={{ opacity: 0.8 }} />
          <span>Dividir en Dos</span>
        </span>
        <span className="kbd-shortcut">⌥⇧S</span>
      </button>

      <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.06)', margin: '4px 0' }} />

      {/* 5. Delete Scene */}
      <button
        className="menu-item-btn danger"
        onClick={() => {
          onDelete(scene.id);
          onClose();
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trash2 size={14} strokeWidth={1.5} style={{ opacity: 0.8 }} />
          <span>Eliminar Escena</span>
        </span>
        <span className="kbd-shortcut">⌫</span>
      </button>
    </div>
  );
}
