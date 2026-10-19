import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, children }) => {
  return (
    <div className="tabs-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        className="tabs-header"
        style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '1px solid var(--border-light)',
          marginBottom: '1rem',
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border-medium) transparent',
          paddingBottom: '4px'
        }}
      >
        {tabs.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <button
              key={t.key}
              type="button"
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onTabChange(t.key)}
              style={{
                flexShrink: 0,
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                padding: '0.5rem 0.65rem',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: '-1px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge && <span style={{ marginLeft: '0.2rem' }}>{t.badge}</span>}
            </button>
          );
        })}
      </div>
      <div className="tabs-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
};
