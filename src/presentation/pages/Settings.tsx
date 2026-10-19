import React, { useState, useEffect, useRef } from 'react';
import { ShopConfigService, ShopInfo } from '../../data/firebase/ShopConfigService';
import { 
  Store, 
  Save, 
  Check, 
  Loader2, 
  Phone, 
  MapPin, 
  FileText, 
  Tag, 
  Shield, 
  Upload, 
  Trash2, 
  Image as ImageIcon,
  Sun,
  Moon,
  Database,
  Printer,
  Globe,
  Mail,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { AutoBackupService } from '../../application/services/AutoBackupService';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branding' | 'security' | 'appearance' | 'backups'>('branding');

  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    name: 'EnTuCel',
    subtitle: 'Servicio Técnico Especializado & Gemelo Digital 3D',
    nit: '900.123.456-7',
    phone: '300 000 0000',
    address: 'Centro Comercial Local 102',
    email: 'contacto@entucel.com',
    website: 'https://entucel.com',
    logoUrl: '',
    maxPinAttempts: 3
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => document.body.classList.contains('dark-mode'));

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ShopConfigService.getShopInfo()
      .then((info: ShopInfo) => {
        setShopInfo(info);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await ShopConfigService.saveShopInfo(shopInfo);
      setShopInfo(updated);
      setSuccessMsg('¡Configuración guardada exitosamente! Todos los cambios se han sincronizado.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('Error al guardar la configuración: ' + (err.message || 'Inténtelo de nuevo.'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG o WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('El tamaño de la imagen no debe superar los 2MB para asegurar un rendimiento óptimo.');
      return;
    }

    setUploadingLogo(true);
    setErrorMsg(null);

    try {
      const newUrl = await ShopConfigService.uploadLogo(file);
      setShopInfo((prev) => ({ ...prev, logoUrl: newUrl }));
      setSuccessMsg('¡Logo del taller actualizado con éxito!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('Error al subir el logo: ' + (err.message || 'Error desconocido'));
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('¿Está seguro de eliminar el logo corporativo del taller?')) return;

    setUploadingLogo(true);
    try {
      await ShopConfigService.removeLogo();
      setShopInfo((prev) => ({ ...prev, logoUrl: '' }));
      setSuccessMsg('Logo eliminado. Se utilizará el ícono estándar del sistema.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('Error al eliminar el logo: ' + (err.message || 'Error desconocido'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const toggleDarkMode = (targetDark: boolean) => {
    setIsDarkMode(targetDark);
    localStorage.setItem('entucel_dark_mode', JSON.stringify(targetDark));
    if (targetDark) {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
    setSuccessMsg(`Tema visual cambiado a ${targetDark ? 'Modo Oscuro' : 'Modo Claro'}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin text-secondary" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Cargando preferencias del taller...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <Store size={24} />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Configuración del Taller
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Administre la identidad comercial, logotipo, reglas de seguridad y apariencia de su plataforma.
          </p>
        </div>

        {/* Botón rápido Guardar Cambios */}
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>

      {/* Alertas de Notificación */}
      {successMsg && (
        <div style={{
          padding: '0.9rem 1.25rem',
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--border-radius-md)',
          color: 'var(--color-success)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          animation: 'fadeIn 0.25s ease'
        }}>
          <Check size={20} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '0.9rem 1.25rem',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--border-radius-md)',
          color: 'var(--color-danger)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <Shield size={20} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selector de Pestañas (Tabs) con Estilo Moderno */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-light)',
        marginBottom: '1.75rem',
        overflowX: 'auto',
        paddingBottom: '0.25rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'branding' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'branding' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'branding' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Store size={18} /> Identidad & Marca
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'security' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'security' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'security' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Shield size={18} /> Operaciones & PIN
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'appearance' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'appearance' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'appearance' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Sun size={18} /> Apariencia & Tema
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backups')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'backups' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'backups' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'backups' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Database size={18} /> Copias de Seguridad
        </button>
      </div>

      {/* PESTAÑA 1: IDENTIDAD & MARCA */}
      {activeTab === 'branding' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.75rem', alignItems: 'start' }}>
          
          {/* Columna Izquierda: Formulario y Logo Uploader */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Tarjeta de Subida de Logotipo */}
            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ImageIcon size={20} className="text-secondary" /> Logotipo del Negocio
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Se reflejará en el menú de navegación, portal de tracking público y tiquetes impresos.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Visualizador / Avatar del Logo */}
                <div style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '2px dashed var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {uploadingLogo ? (
                    <Loader2 size={30} className="animate-spin text-secondary" />
                  ) : shopInfo.logoUrl ? (
                    <img 
                      src={shopInfo.logoUrl} 
                      alt="Logo del Taller" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} 
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-muted)' }}>
                      <Store size={32} style={{ opacity: 0.4, margin: '0 auto 0.25rem' }} />
                      <span style={{ fontSize: '0.7rem', display: 'block' }}>Sin Logo</span>
                    </div>
                  )}
                </div>

                {/* Controles de Subida */}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Upload size={16} /> {shopInfo.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                    </button>

                    {shopInfo.logoUrl && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleRemoveLogo}
                        disabled={uploadingLogo}
                        style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        title="Eliminar logo actual"
                      >
                        <Trash2 size={16} /> Quitar
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Formatos admitidos: <strong>PNG, JPG, WebP, SVG</strong>.<br />
                    Resolución sugerida: <strong>300x300 px</strong> o proporción horizontal similar. Máx 2MB.
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario de Información Comercial */}
            <form onSubmit={handleSave} className="glass-card" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Store size={20} className="text-secondary" /> Datos Legales y de Contacto
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Nombre Comercial del Taller / Local <span className="required-asterisk">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="ej. EnTuCel Taller Técnico"
                      value={shopInfo.name}
                      onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
                      required
                    />
                    <Store size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Slogan o Subtítulo Institucional
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="ej. Servicio Técnico Especializado & Gemelo Digital 3D"
                      value={shopInfo.subtitle}
                      onChange={(e) => setShopInfo({ ...shopInfo, subtitle: e.target.value })}
                    />
                    <Tag size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      NIT / Cédula / RUT <span className="required-asterisk">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="ej. 900.123.456-7"
                        value={shopInfo.nit}
                        onChange={(e) => setShopInfo({ ...shopInfo, nit: e.target.value })}
                        required
                      />
                      <FileText size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Teléfono / WhatsApp <span className="required-asterisk">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="ej. 300 123 4567"
                        value={shopInfo.phone}
                        onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
                        required
                      />
                      <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Dirección Física del Local <span className="required-asterisk">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="ej. Carrera 15 # 82 - 04, Local 102"
                      value={shopInfo.address}
                      onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
                      required
                    />
                    <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Correo Electrónico de Contacto
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="contacto@mitaller.com"
                        value={shopInfo.email || ''}
                        onChange={(e) => setShopInfo({ ...shopInfo, email: e.target.value })}
                      />
                      <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Sitio Web o Portal
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="url"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="https://mitaller.com"
                        value={shopInfo.website || ''}
                        onChange={(e) => setShopInfo({ ...shopInfo, website: e.target.value })}
                      />
                      <Globe size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.65rem 1.75rem', gap: '0.5rem' }}>
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Guardar Identidad
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Columna Derecha: Vista Previa en Vivo de Marca y Tiquete */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '1.5rem' }}>
            
            {/* Widget de Simulación de Cabecera en Sistema */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={14} className="text-secondary" /> Vista Previa en Barra de Menú
                </span>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>En Vivo</span>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '0.85rem 1.25rem',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                {shopInfo.logoUrl ? (
                  <img
                    src={shopInfo.logoUrl}
                    alt="Preview"
                    style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }}
                  />
                ) : (
                  <Store size={26} className="text-secondary" />
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: '1.2' }}>{shopInfo.name || 'EnTuCel'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Panel Administrativo</div>
                </div>
              </div>
            </div>

            {/* Widget de Simulación de Tiquete Térmico 80mm */}
            <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#fafafa', color: '#111827', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Printer size={16} /> Tiquete Físico (Térmico 80mm)
                </span>
                <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>Muestra Recibo</span>
              </div>

              {/* Tiquete renderizado con tipografía monoespaciada */}
              <div style={{
                fontFamily: 'Courier New, Courier, monospace',
                fontSize: '0.8rem',
                lineHeight: '1.4',
                textAlign: 'center',
                padding: '0.5rem 0'
              }}>
                {shopInfo.logoUrl && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <img 
                      src={shopInfo.logoUrl} 
                      alt="Logo Ticket" 
                      style={{ maxHeight: '42px', maxWidth: '120px', objectFit: 'contain', filter: 'grayscale(100%) contrast(150%)' }} 
                    />
                  </div>
                )}
                
                <div style={{ fontWeight: 'bold', fontSize: '1rem', textTransform: 'uppercase' }}>
                  {shopInfo.name || 'ENTUCEL'}
                </div>
                {shopInfo.nit && <div style={{ fontSize: '0.75rem' }}>NIT: {shopInfo.nit}</div>}
                <div style={{ fontSize: '0.75rem' }}>{shopInfo.address}</div>
                <div style={{ fontSize: '0.75rem' }}>TEL: {shopInfo.phone}</div>
                {shopInfo.subtitle && (
                  <div style={{ fontSize: '0.7rem', fontStyle: 'italic', marginTop: '0.2rem' }}>
                    "{shopInfo.subtitle}"
                  </div>
                )}

                <div style={{ borderTop: '1px dashed #9ca3af', margin: '0.6rem 0' }} />

                <div style={{ fontWeight: 'bold' }}>TIQUETE DE RECEPCIÓN</div>
                <div style={{ fontWeight: 'bold' }}>ORDEN: OR-1042</div>
                <div style={{ textAlign: 'left', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                  <div>CLIENTE: Carlos Gómez</div>
                  <div>EQUIPO: iPhone 13 Pro Max</div>
                  <div>ESTADO: En Proceso</div>
                </div>

                <div style={{ borderTop: '1px dashed #9ca3af', margin: '0.6rem 0' }} />
                <div style={{ fontSize: '0.68rem', color: '#4b5563' }}>
                  Consulte el Gemelo Digital escaneando el código QR o en {shopInfo.website || 'entucel.com'}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PESTAÑA 2: OPERACIONES & SEGURIDAD */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '720px' }}>
          <form onSubmit={handleSave} className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={22} className="text-secondary" /> Parámetros de Seguridad y Aprobación
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
              Defina las directivas de verificación que protegen las decisiones de aprobación presupuestaria del cliente en el portal web.
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Intentos Máximos de PIN para Aprobación Web de Clientes
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ position: 'relative', width: '120px' }}>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', fontSize: '1.1rem', fontWeight: 700 }}
                    value={shopInfo.maxPinAttempts ?? 3}
                    onChange={(e) => setShopInfo({ ...shopInfo, maxPinAttempts: Math.max(1, Math.min(10, Number(e.target.value) || 3)) })}
                  />
                  <Shield size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                  Recomendado: 3 intentos
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block', lineHeight: '1.4' }}>
                Si el cliente agota este número de intentos fallidos al ingresar los últimos 4 dígitos de su teléfono, el portal bloqueará temporalmente el teclado y mostrará un botón de asistencia directa por WhatsApp con el taller.
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem 1.25rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-light)', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <HelpCircle size={20} className="text-secondary" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                  <strong>¿Cómo funciona la validación con PIN telefónico?</strong><br />
                  Para autorizar el presupuesto en el tracking público, el cliente debe ingresar los últimos 4 dígitos de su teléfono de contacto registrado en la orden. Esto garantiza trazabilidad legal sin obligar al cliente a crear contraseñas.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.65rem 1.75rem', gap: '0.5rem' }}>
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Guardar Parámetros
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA: APARIENCIA & TEMA */}
      {activeTab === 'appearance' && (
        <div style={{ maxWidth: '780px' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sun size={22} className="text-secondary" /> Tema Visual del Sistema
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
              Seleccione el modo visual preferido para trabajar de forma cómoda durante el día o en jornadas de taller nocturnas.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              
              {/* Opción Modo Claro */}
              <div 
                onClick={() => toggleDarkMode(false)}
                style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: !isDarkMode ? '2px solid var(--color-primary)' : '1px solid var(--border-medium)',
                  backgroundColor: !isDarkMode ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative'
                }}
              >
                {!isDarkMode && (
                  <span className="badge badge-success" style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.72rem' }}>
                    Activo
                  </span>
                )}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sun size={24} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Modo Claro</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Fondo blanco limpio con máximo contraste, ideal para ambientes muy iluminados.
                  </p>
                </div>
              </div>

              {/* Opción Modo Oscuro */}
              <div 
                onClick={() => toggleDarkMode(true)}
                style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: isDarkMode ? '2px solid var(--color-primary)' : '1px solid var(--border-medium)',
                  backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative'
                }}
              >
                {isDarkMode && (
                  <span className="badge badge-success" style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.72rem' }}>
                    Activo
                  </span>
                )}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Moon size={24} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Modo Oscuro</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Paleta suave de bajo brillo para descansar la vista y destacar el Gemelo Digital 3D.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: COPIAS DE SEGURIDAD */}
      {activeTab === 'backups' && (
        <div style={{ maxWidth: '780px' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={22} className="text-secondary" /> Copias de Seguridad & Auto-Backup
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
              El sistema ejecuta automáticamente respaldos en memoria local cada 5 minutos. También puede exportar copias completas en JSON para almacenamiento en disco o migración de servidor.
            </p>

            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-light)', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                  Programador de Respaldo Automático
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Frecuencia de sincronización: <strong>Cada 5 minutos</strong> (Activo en segundo plano)
                </span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                🟢 En Ejecución
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  AutoBackupService.saveAutoBackup();
                  setSuccessMsg('Copia de respaldo manual guardada exitosamente en el almacenamiento local.');
                  setTimeout(() => setSuccessMsg(null), 4000);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
              >
                <Save size={18} /> Respaldar Ahora
              </button>

              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => AutoBackupService.downloadBackupFile()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
              >
                <Database size={18} /> Descargar Respaldo JSON
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
