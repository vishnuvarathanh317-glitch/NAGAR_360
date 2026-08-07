import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const SEVERITY_COLORS = {
  critical: '#ed4956',
  high: '#ff6d00',
  medium: '#ffab00',
  low: '#0095f6',
  resolved: '#00c853'
};

function createIcon(severity) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${color}" stroke="#000" stroke-width="2" opacity="0.9"/>
    <circle cx="12" cy="12" r="4" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  });
}

export default function CivicMap({ markers = [], height = '350px', center, zoom = 13 }) {
  const defaultCenter = center || (
    markers.length > 0
      ? [markers[0].latitude, markers[0].longitude]
      : [13.0827, 80.2707] // Chennai default
  );

  return (
    <MapContainer
      center={defaultCenter}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: 'var(--radius-lg)' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      {markers.map((m) => (
        m.latitude && m.longitude ? (
          <Marker
            key={m.id || m.complaint_id}
            position={[m.latitude, m.longitude]}
            icon={createIcon(
              m.status === 'resolved' || m.status === 'citizen_verified' ? 'resolved' : m.severity
            )}
          >
            <Popup>
              <div style={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>
                  {m.title || 'Civic Issue'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a8a8a8', marginBottom: 4 }}>
                  📍 {m.address || m.ward || ''}
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: '0.72rem' }}>
                  <span style={{ color: SEVERITY_COLORS[m.severity] || '#ffab00', fontWeight: 700 }}>
                    {(m.severity || '').toUpperCase()}
                  </span>
                  <span style={{ color: '#737373' }}>{m.complaint_id}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  );
}
