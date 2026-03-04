import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createColorIcon = (color, emoji) => L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${emoji}</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

export default function MapView({ pickup, drop, driverLocation, onMapClick, selectingFor, center }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const routeRef = useRef(null);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      const defaultCenter = center || [12.9716, 77.5946]; // Bangalore
      mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView(defaultCenter, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);
    }
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Handle map click for selecting pickup/drop
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !onMapClick) return;
    const handler = (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    if (selectingFor) {
      map.on('click', handler);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', handler);
      map.getContainer().style.cursor = '';
    }
    return () => { map.off('click', handler); map.getContainer().style.cursor = ''; };
  }, [selectingFor, onMapClick]);

  // Update pickup marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (pickup) {
      if (markersRef.current.pickup) markersRef.current.pickup.remove();
      markersRef.current.pickup = L.marker([pickup.lat, pickup.lng], { icon: createColorIcon('#22c55e', '📍') })
        .addTo(map).bindPopup(`<b>Pickup</b><br>${pickup.address || ''}`);
    }
  }, [pickup]);

  // Update drop marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (drop) {
      if (markersRef.current.drop) markersRef.current.drop.remove();
      markersRef.current.drop = L.marker([drop.lat, drop.lng], { icon: createColorIcon('#ff6b2b', '🏁') })
        .addTo(map).bindPopup(`<b>Drop</b><br>${drop.address || ''}`);
    }
  }, [drop]);

  // Draw route between pickup and drop
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
    if (pickup && drop) {
      routeRef.current = L.polyline([[pickup.lat, pickup.lng], [drop.lat, drop.lng]], {
        color: '#ff6b2b', weight: 3, opacity: 0.7, dashArray: '8,4'
      }).addTo(map);
      map.fitBounds([[pickup.lat, pickup.lng], [drop.lat, drop.lng]], { padding: [40, 40] });
    }
  }, [pickup, drop]);

  // Update driver marker (live)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (driverLocation) {
      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng([driverLocation.lat, driverLocation.lng]);
      } else {
        markersRef.current.driver = L.marker([driverLocation.lat, driverLocation.lng], {
          icon: createColorIcon('#3b82f6', '🏍️'), zIndexOffset: 1000
        }).addTo(map).bindPopup('<b>Your Driver</b>');
      }
    } else {
      if (markersRef.current.driver) { markersRef.current.driver.remove(); markersRef.current.driver = null; }
    }
  }, [driverLocation]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
  );
}
