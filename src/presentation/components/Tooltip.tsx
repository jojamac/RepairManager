import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'right',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (disabled || !content) {
    return <>{children}</>;
  }

  const getPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case 'right':
        return {
          left: 'calc(100% + 12px)',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'left':
        return {
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginRight: '10px',
        };
      case 'top':
        return {
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '10px',
        };
      case 'bottom':
        return {
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '10px',
        };
      default:
        return {};
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          className="custom-tooltip-bubble fade-in"
          style={{
            position: 'absolute',
            zIndex: 10000,
            whiteSpace: 'nowrap',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.01em',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border-medium)',
            border: '1px solid var(--border-medium)',
            pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
            ...getPositionStyles(),
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
