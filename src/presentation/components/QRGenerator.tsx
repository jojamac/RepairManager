import React from 'react';

interface QRGeneratorProps {
  value: string;
  size?: number;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ value, size = 120 }) => {
  // Utilizar la API QRServer con margen blanco claro (margin=2) para contraste perfecto
  const encodedUrl = encodeURIComponent(value);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodedUrl}&margin=2&qzone=2`;

  return (
    <div 
      className="qr-container-clean"
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        padding: '2px', 
        backgroundColor: '#ffffff', 
        borderRadius: '0px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'none',
        border: 'none'
      }}
    >
      <img 
        src={qrImageUrl} 
        alt={`QR: ${value}`} 
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} 
      />
    </div>
  );
};
