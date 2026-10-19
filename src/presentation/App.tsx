import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../application/hooks/useAuth';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { PublicTracking } from './pages/PublicTracking';
import { Dashboard } from './pages/Dashboard';
import { ServiceOrders } from './pages/ServiceOrders';
import { ServiceOrderDetail } from './pages/ServiceOrderDetail';
import { Clients } from './pages/Clients';
import { Financial } from './pages/Financial';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { hasPermission, Permission } from '../domain/entities/User';

import { 
  LayoutDashboard, 
  Wrench, 
  Users as UsersIcon, 
  CreditCard, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Smartphone,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Settings as SettingsIcon
} from 'lucide-react';

import { Tooltip } from './components/Tooltip';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AutoBackupService } from '../application/services/AutoBackupService';
import { useToast } from './components/Toast';
import { useServiceOrders } from '../application/hooks/useServiceOrders';
import { ServiceOrder } from '../domain/entities/ServiceOrder';
import { ShopConfigService, ShopInfo } from '../data/firebase/ShopConfigService';
import { db } from '../data/firebase/config';
import { collection, query, onSnapshot } from 'firebase/firestore';

// Wrapper para ServiceOrderDetail que extrae el orderId desde la URL
const ServiceOrderDetailWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  if (!id) {
    return <Navigate to="/orders" replace />;
  }

  const handleBack = () => {
    const state = location.state as { from?: string; clientId?: string } | null;
    if (state?.from) {
      navigate(state.from, { state: { clientId: state.clientId } });
    } else {
      navigate('/orders');
    }
  };

  return (
    <ServiceOrderDetail 
      orderId={id} 
      onBack={handleBack} 
    />
  );
};

// Componente Layout Principal con Navegación por Rutas y Permisos
const MainLayout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado de cierre de sesión fluido
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setLoggingOut(true);
    try {
      await Promise.all([
        logout(),
        new Promise(resolve => setTimeout(resolve, 600))
      ]);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  // Estado de Sidebar móvil
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estado de Menú desplegable de perfil de usuario
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Estado de Sidebar colapsado en Escritorio (por defecto expandido/abierto para ver el nombre y opciones completas)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('entucel_sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('entucel_sidebar_collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);
  
  // Estado de Modo Oscuro (Detección automática del sistema operativo + Persistencia)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('entucel_dark_mode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Si no hay preferencia manual guardada, detectar preferencia del sistema OS
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Manejar modo oscuro, persistencia y listener de preferencia del sistema
  useEffect(() => {
    localStorage.setItem('entucel_dark_mode', JSON.stringify(darkMode));
    const body = document.body;
    if (darkMode) {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
    }
  }, [darkMode]);

  // Escuchar cambios en la preferencia de tema del SO si no hay override guardado
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const hasSavedOverride = localStorage.getItem('entucel_dark_mode') !== null;
      if (!hasSavedOverride) {
        setDarkMode(e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
    return undefined;
  }, []);

  // Información de Marca del Taller (Logo, Nombre)
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);

  useEffect(() => {
    ShopConfigService.getShopInfo().then(setShopInfo).catch(console.warn);

    const handleShopUpdate = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setShopInfo(customEvt.detail);
      } else {
        ShopConfigService.getShopInfo().then(setShopInfo).catch(console.warn);
      }
    };

    window.addEventListener('entucel_shop_info_updated', handleShopUpdate);
    return () => window.removeEventListener('entucel_shop_info_updated', handleShopUpdate);
  }, []);

  // Iniciar respaldo automático periódico (cada 5 minutos)
  useEffect(() => {
    const cleanupScheduler = AutoBackupService.initAutoBackupScheduler();
    return () => cleanupScheduler();
  }, []);


  const toast = useToast();
  const { loadOrders } = useServiceOrders();

  // Escuchar en tiempo real si el cliente aprueba una orden desde cualquier dispositivo
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;
    if (db) {
      try {
        const q = query(collection(db, 'orders'));
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const data = change.doc.data() as ServiceOrder;
              const lastHistory = data.statusHistory && data.statusHistory[data.statusHistory.length - 1];
              const isClientApproved = data.status === 'reparacion' && (
                lastHistory?.updatedBy?.includes('Cliente') ||
                lastHistory?.notes?.toLowerCase().includes('aprobación de presupuesto verificada')
              );
              if (isClientApproved && currentUser) {
                // Verificar si el usuario actual es el técnico que diagnosticó, el asignado o el administrador
                const diagEntry = data.statusHistory?.find(h => h.status === 'diagnostico');
                const isDiagnosingTech = Boolean(diagEntry?.updatedBy && (
                  diagEntry.updatedBy.toLowerCase().includes(currentUser.name.toLowerCase()) ||
                  diagEntry.updatedBy.toLowerCase().includes(currentUser.email.toLowerCase())
                ));
                const isAssignedTech = Boolean(
                  (data.technicianId && data.technicianId === currentUser.id) ||
                  (data.technicianName && data.technicianName.toLowerCase() === currentUser.name.toLowerCase())
                );
                const isAdmin = currentUser.role === 'admin';

                // Mostrar toast SOLO al técnico responsable o al administrador
                if (isDiagnosingTech || isAssignedTech || isAdmin) {
                  const title = `⚡ Aprobación de Presupuesto · ${data.id}`;
                  const message = (isDiagnosingTech || isAssignedTech)
                    ? `¡El cliente autorizó el presupuesto de tu orden ${data.id} (${data.brand} ${data.model})! Ya puedes proceder con la reparación.`
                    : `El cliente autorizó el presupuesto de la orden ${data.id}${data.technicianName ? ` (Asignada a ${data.technicianName})` : ''}.`;

                  toast.success(
                    message,
                    title,
                    {
                      duration: 10000,
                      actionText: '👉 Clic aquí para abrir el detalle de la orden',
                      onClick: () => navigate(`/orders/${data.id}`)
                    }
                  );
                }
                loadOrders(true);
              }
            }
          });
        }, (err) => console.warn('onSnapshot global orders notice:', err));
      } catch (e) {
        console.warn('Skip global onSnapshot:', e);
      }
    }

    const handleLocalApproval = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      if (customEvt.detail?.orderId) {
        const approvedOrderId = customEvt.detail.orderId;
        toast.success(
          `¡Presupuesto autorizado para la orden ${approvedOrderId}! Pasó a estado "En Reparación".`,
          `⚡ Presupuesto Aprobado · ${approvedOrderId}`,
          {
            duration: 10000,
            actionText: '👉 Clic aquí para abrir el detalle de la orden',
            onClick: () => navigate(`/orders/${approvedOrderId}`)
          }
        );
        loadOrders(true);
      }
    };

    window.addEventListener('entucel_order_approved', handleLocalApproval);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      window.removeEventListener('entucel_order_approved', handleLocalApproval);
    };
  }, [toast, loadOrders, currentUser, navigate]);

  const handlePromoteQuote = () => {
    navigate('/orders');
  };

  const navItems: { path: string; label: string; icon: React.ReactNode; permission: Permission }[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, permission: 'view_dashboard' },
    { path: '/orders', label: 'Órdenes de Trabajo', icon: <Wrench size={20} />, permission: 'view_orders' },
    { path: '/clients', label: 'Clientes / CRM', icon: <UsersIcon size={20} />, permission: 'view_clients' },
    { path: '/users', label: 'Personal / Empleados', icon: <ShieldCheck size={20} />, permission: 'view_users' },
    { path: '/finance', label: 'Finanzas', icon: <CreditCard size={20} />, permission: 'view_finance' },
    { path: '/settings', label: 'Configuración', icon: <SettingsIcon size={20} />, permission: 'manage_settings' },
  ];

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      {/* Cabecera Móvil Limpia */}
      <div 
        style={{ 
          display: 'none', 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '0.85rem 1.25rem', 
          borderBottom: '1px solid var(--border-light)',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 300,
          width: '100%'
        }}
        className="mobile-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="mobile-nav-toggle" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={sidebarOpen ? 'Cerrar Menú' : 'Abrir Menú'}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {shopInfo?.logoUrl ? (
              <img 
                src={shopInfo.logoUrl} 
                alt={shopInfo.name || 'Logo'} 
                style={{ 
                  maxHeight: '32px',
                  maxWidth: '48px',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  flexShrink: 0
                }} 
              />
            ) : (
              <Smartphone size={22} className="text-secondary" />
            )}
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
              {shopInfo?.name || 'EnTuCel'}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1025px) {
          .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            height: 100vh !important;
            height: 100dvh !important;
            width: ${sidebarCollapsed ? '80px' : 'var(--sidebar-width)'} !important;
            transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            z-index: 100 !important;
            overflow: ${sidebarCollapsed ? 'visible' : 'hidden'} !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .main-content {
            margin-left: ${sidebarCollapsed ? '80px' : 'var(--sidebar-width)'} !important;
            transition: margin-left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            width: calc(100% - ${sidebarCollapsed ? '80px' : 'var(--sidebar-width)'}) !important;
            max-width: none !important;
          }
          .sidebar-brand span, .sidebar-link span, .sidebar-footer-text, .user-info {
            display: ${sidebarCollapsed ? 'none' : 'flex'} !important;
          }
          .sidebar-nav {
            overflow: ${sidebarCollapsed ? 'visible' : 'auto'} !important;
          }
          .sidebar-brand {
            justify-content: ${sidebarCollapsed ? 'center' : 'space-between'} !important;
            padding: ${sidebarCollapsed ? '1.5rem 0.5rem' : '2rem 1.5rem'} !important;
          }
          .sidebar-link {
            justify-content: ${sidebarCollapsed ? 'center' : 'flex-start'} !important;
            padding: ${sidebarCollapsed ? '0.85rem 0' : '0.85rem 1.25rem'} !important;
          }
          .user-profile-badge {
            justify-content: ${sidebarCollapsed ? 'center' : 'flex-start'} !important;
          }
        }


        @media (max-width: 1024px) {
          .mobile-header {
            display: flex !important;
          }
          .desktop-toggle {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
            padding: 1rem !important;
            box-sizing: border-box !important;
          }
          .sidebar-brand span, .sidebar-link span, .sidebar-footer-text, .user-info {
            display: flex !important;
          }
          .sidebar-brand {
            justify-content: space-between !important;
            padding: 1.5rem 1rem !important;
          }
          .sidebar-link {
            justify-content: flex-start !important;
            padding: 0.85rem 1rem !important;
          }
          .user-profile-badge {
            justify-content: flex-start !important;
          }
          .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 280px !important;
            max-width: 85vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            background-color: var(--bg-secondary) !important;
            border-right: 1px solid var(--border-medium) !important;
            box-shadow: 4px 0 15px rgba(0, 0, 0, 0.25) !important;
            transform: translateX(${sidebarOpen ? '0' : '-100%'}) !important;
            transition: transform 0.25s ease-in-out !important;
            z-index: 9999 !important;
            overflow-y: auto !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .sidebar-overlay {
            display: ${sidebarOpen ? 'block' : 'none'};
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9990;
          }
        }
      `}</style>

      {/* Overlay oscuro de fondo al abrir menú móvil */}
      <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />

      {/* Menú Lateral (Sidebar) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
            {shopInfo?.logoUrl ? (
              <img 
                src={shopInfo.logoUrl} 
                alt={shopInfo.name || 'Logo'} 
                style={{ 
                  height: '36px',
                  width: 'auto',
                  maxWidth: sidebarCollapsed ? '48px' : '60px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  flexShrink: 0,
                  display: 'block'
                }} 
              />
            ) : (
              <Smartphone size={24} className="text-secondary" style={{ flexShrink: 0 }} />
            )}
            <span 
              title={shopInfo?.name || 'EnTuCel'}
              style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.3px',
                flex: 1
              }}
            >
              {shopInfo?.name || 'EnTuCel'}
            </span>
          </div>

          {/* Botón para alternar menú en Escritorio */}
          <button 
            className="desktop-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              padding: '0.2rem'
            }}
            title={sidebarCollapsed ? 'Expandir Menú' : 'Colapsar Menú'}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {/* Botón de Cierre de menú dentro de la barra desplegada en Móviles */}
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'none',
              padding: '0.2rem'
            }}
            className="mobile-close-btn"
            title="Cerrar Menú"
          >
            <X size={22} />
          </button>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .mobile-close-btn {
              display: flex !important;
            }
          }
        `}</style>

        <nav className="sidebar-nav">
          {navItems
            .filter(item => hasPermission(currentUser, item.permission))
            .map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Tooltip key={item.path} content={item.label} disabled={!sidebarCollapsed} position="right">
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </Tooltip>
              );
            })}
        </nav>

        {/* Footer del Sidebar con Menú Desplegable de Usuario */}
        <div className="sidebar-footer" style={{ position: 'relative', padding: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
          
          {/* Menú Popover Desplegable (Cerrar Sesión + Tema) */}
          {userDropdownOpen && (
            <div
              className="fade-in"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: sidebarCollapsed ? '10px' : '12px',
                right: sidebarCollapsed ? 'auto' : '12px',
                width: sidebarCollapsed ? '220px' : 'auto',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--border-radius-md)',
                padding: '0.6rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-light)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              {/* Encabezado con info completa */}
              <div style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border-light)', marginBottom: '0.2rem' }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                  {currentUser.name}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize', display: 'block', marginTop: '1px' }}>
                  Rol: {currentUser.role}
                </span>
              </div>

              {/* Opción de Tema Visual */}
              <button
                type="button"
                onClick={() => {
                  setDarkMode(!darkMode);
                  setUserDropdownOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </span>
              </button>

              {/* Botón Cerrar Sesión */}
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.6rem',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--color-danger)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: loggingOut ? 'not-allowed' : 'pointer',
                  opacity: loggingOut ? 0.75 : 1,
                  marginTop: '0.2rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!loggingOut) {
                    e.currentTarget.style.backgroundColor = 'var(--color-danger)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loggingOut) {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                    e.currentTarget.style.color = 'var(--color-danger)';
                  }
                }}
              >
                {loggingOut ? (
                  <>
                    <div className="loading-spinner-circle" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: 'var(--color-danger)' }} />
                    <span>Cerrando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tarjeta Clicable de Perfil del Usuario */}
          <Tooltip content={`${currentUser.name} (${currentUser.role}) — Haz clic para desplegar menú`} disabled={!sidebarCollapsed} position="right">
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                padding: sidebarCollapsed ? '0.4rem 0' : '0.5rem 0.6rem',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: userDropdownOpen ? 'var(--bg-tertiary)' : 'transparent',
                border: userDropdownOpen ? '1px solid var(--border-medium)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                if (!userDropdownOpen) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                if (!userDropdownOpen) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                <div className="user-avatar" style={{ flexShrink: 0 }}>
                  {currentUser.name.charAt(0)}
                </div>
                
                <div className="user-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, textAlign: 'left' }}>
                  <span 
                    className="user-name" 
                    style={{ 
                      fontWeight: 700, 
                      fontSize: '0.83rem', 
                      color: 'var(--text-primary)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      maxWidth: '130px'
                    }}
                  >
                    {currentUser.name}
                  </span>
                  <span className="user-role" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '1px' }}>
                    {currentUser.role}
                  </span>
                </div>
              </div>

              {!sidebarCollapsed && (
                <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {userDropdownOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              )}
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Área de Contenido Principal con Evaluación Granular de Permisos */}
      <main className="main-content">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<ServiceOrders onSelectOrder={(id) => navigate(`/orders/${id}`)} />} />
          <Route path="orders/:id" element={<ServiceOrderDetailWrapper />} />
          <Route path="clients" element={<Clients />} />
          <Route 
            path="users" 
            element={
              hasPermission(currentUser, 'view_users') ? (
                <Users />
              ) : (
                <div className="glass-card text-center" style={{ padding: '3rem' }}>
                  <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Acceso Restringido</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>No tiene permisos de administrador para ver o gestionar el personal.</p>
                </div>
              )
            } 
          />
          <Route 
            path="finance" 
            element={
              hasPermission(currentUser, 'view_finance') ? (
                <Financial onPromoteQuoteToOrder={handlePromoteQuote} />
              ) : (
                <div className="glass-card text-center" style={{ padding: '3rem' }}>
                  <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Acceso Restringido</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>No tiene permisos para consultar el módulo financiero.</p>
                </div>
              )
            } 
          />
          <Route 
            path="settings" 
            element={
              hasPermission(currentUser, 'manage_settings') ? (
                <Settings />
              ) : (
                <div className="glass-card text-center" style={{ padding: '3rem' }}>
                  <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Acceso Restringido</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>No tiene permisos para modificar la configuración del taller.</p>
                </div>
              )
            } 
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      {/* Overlay Visual de Cierre de Sesión Fluido */}
      {loggingOut && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            gap: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '16px', 
              backgroundColor: 'var(--bg-secondary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              border: '1px solid var(--border-light)'
            }}
          >
            <LogOut size={26} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
              Cerrando sesión...
            </h4>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              Finalizando sesión de forma segura
            </p>
          </div>
          <div className="loading-spinner-circle" style={{ width: '28px', height: '28px', borderWidth: '3px', borderTopColor: 'var(--color-primary)' }} />
        </div>
      )}

      <PWAInstallPrompt />
    </div>
  );
};

export const App: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: '100vh', 
          width: '100vw', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: 'var(--bg-primary)',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--color-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(250, 92, 60, 0.35)'
            }}
          >
            <Smartphone size={24} />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            EnTuCel
          </span>
        </div>
        <div className="loading-spinner-circle" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Iniciando sistema...
        </span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route 
          path="/login" 
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          } 
        />
        <Route path="/reset-password" element={<ResetPassword onNavigateToLogin={() => {}} />} />
        <Route path="/tracking" element={<PublicTracking onNavigateToLogin={() => {}} />} />

        {/* Rutas Autenticadas protegidas con Layout */}
        <Route 
          path="/*" 
          element={
            currentUser ? (
              <MainLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

