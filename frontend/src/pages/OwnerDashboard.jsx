import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MapView from '../components/MapView';
import Toast, { showToast } from '../components/Toast';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

const calcDistance = (a, b) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const calcFare = (km) => Math.round(30 + km * 12);

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [selectingFor, setSelectingFor] = useState(null); // 'pickup' | 'drop'
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropSearch, setDropSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTarget, setSearchTarget] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('book'); // 'book' | 'history'
  const [history, setHistory] = useState([]);

  // Fetch active ride on mount
  useEffect(() => {
    fetchActiveRide();
  }, []);

  const fetchActiveRide = async () => {
    try {
      const res = await axios.get('/api/rides/active');
      if (res.data.ride) {
        setActiveRide(res.data.ride);
        setTab('tracking');
        if (res.data.ride.driver?.currentLocation) {
          setDriverLocation(res.data.ride.driver.currentLocation);
        }
      }
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/rides/my-rides');
      setHistory(res.data.rides);
    } catch {}
  };

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('ride:booked', ({ ride }) => {
      setActiveRide(ride);
      setTab('tracking');
      showToast('Ride booked! Waiting for driver...', 'success');
    });

    socket.on('ride:accepted', ({ ride }) => {
      setActiveRide(ride);
      showToast(`Driver ${ride.driver?.name} accepted your ride! 🏍️`, 'success');
    });

    socket.on('driver:moved', ({ lat, lng }) => {
      setDriverLocation({ lat, lng });
    });

    socket.on('ride:started', () => {
      showToast('Your ride has started! 🚀', 'info');
    });

    socket.on('ride:completed', () => {
      showToast('Ride completed! Thanks for riding with RapidoX 🎉', 'success');
      setActiveRide(prev => prev ? { ...prev, status: 'completed' } : prev);
      setTimeout(() => { setActiveRide(null); setDriverLocation(null); setTab('book'); }, 3000);
    });

    socket.on('ride:cancelled', () => {
      showToast('Ride was cancelled', 'error');
      setActiveRide(null); setDriverLocation(null); setTab('book');
    });

    socket.on('error', ({ message }) => showToast(message, 'error'));

    return () => {
      socket.off('ride:booked'); socket.off('ride:accepted');
      socket.off('driver:moved'); socket.off('ride:started');
      socket.off('ride:completed'); socket.off('ride:cancelled'); socket.off('error');
    };
  }, [socket]);

  // Join active ride room
  useEffect(() => {
    if (socket && activeRide && (activeRide.status === 'pending' || activeRide.status === 'accepted' || activeRide.status === 'in_progress')) {
      socket.emit('owner:joinRide', { rideId: activeRide._id });
    }
  }, [socket, activeRide?._id]);

  const searchLocation = async (query, target) => {
    if (!query || query.length < 3) return;
    setSearchTarget(target);
    try {
      const res = await fetch(`${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`);
      const data = await res.json();
      setSearchResults(data.map(d => ({ display_name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })));
    } catch {
      showToast('Location search failed', 'error');
    }
  };

  const selectLocation = (loc) => {
    const short = loc.display_name.split(',').slice(0, 3).join(',');
    if (searchTarget === 'pickup') {
      setPickup({ lat: loc.lat, lng: loc.lng, address: short });
      setPickupSearch(short);
    } else {
      setDrop({ lat: loc.lat, lng: loc.lng, address: short });
      setDropSearch(short);
    }
    setSearchResults([]); setSearchTarget(null);
  };

  const handleMapClick = useCallback(async ({ lat, lng }) => {
    try {
      const res = await fetch(`${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const address = data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      if (selectingFor === 'pickup') {
        setPickup({ lat, lng, address }); setPickupSearch(address);
      } else if (selectingFor === 'drop') {
        setDrop({ lat, lng, address }); setDropSearch(address);
      }
    } catch {
      const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      if (selectingFor === 'pickup') { setPickup({ lat, lng, address }); setPickupSearch(address); }
      else if (selectingFor === 'drop') { setDrop({ lat, lng, address }); setDropSearch(address); }
    }
    setSelectingFor(null);
  }, [selectingFor]);

  const bookRide = () => {
    if (!pickup || !drop) return showToast('Please select pickup and drop locations', 'error');
    if (!socket) return showToast('Not connected to server', 'error');
    const distance = calcDistance(pickup, drop);
    const fare = calcFare(distance);
    socket.emit('owner:bookRide', { pickup, drop, fare, distance: parseFloat(distance.toFixed(2)) });
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const cancelRide = () => {
    if (!activeRide) return;
    socket.emit('owner:cancelRide', { rideId: activeRide._id });
  };

  const distance = pickup && drop ? calcDistance(pickup, drop) : 0;
  const fare = distance ? calcFare(distance) : 0;

  return (
    <>
      <Toast />
      <div className="map-panel">
        <MapView
          pickup={pickup}
          drop={drop}
          driverLocation={driverLocation}
          onMapClick={handleMapClick}
          selectingFor={selectingFor}
        />
        {selectingFor && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: 20, fontFamily: 'Syne', fontWeight: 700, zIndex: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            Click on map to set {selectingFor} 📍
          </div>
        )}
      </div>

      <div className="side-panel">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 10, padding: 4 }}>
          {[['book', '🏠 Book'], ['tracking', '📍 Track'], ['history', '📋 History']].map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); if (k === 'history') fetchHistory(); }}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.2s', background: tab === k ? 'var(--accent)' : 'transparent', color: tab === k ? 'white' : 'var(--text2)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* BOOK TAB */}
        {tab === 'book' && !activeRide && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: '1.1rem' }}>Book a Ride</h3>

            {/* Pickup */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label>📍 Pickup Location</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input-field" placeholder="Search pickup..." value={pickupSearch}
                  onChange={e => { setPickupSearch(e.target.value); searchLocation(e.target.value, 'pickup'); }}
                  style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectingFor(selectingFor === 'pickup' ? null : 'pickup')}
                  style={{ padding: '8px 10px', background: selectingFor === 'pickup' ? 'var(--accent)' : undefined }}>🗺️</button>
              </div>
              {searchResults.length > 0 && searchTarget === 'pickup' && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, maxHeight: 180, overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                  {searchResults.map((r, i) => (
                    <div key={i} onClick={() => selectLocation(r)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {r.display_name.split(',').slice(0, 3).join(',')}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drop */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label>🏁 Drop Location</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input-field" placeholder="Search drop..." value={dropSearch}
                  onChange={e => { setDropSearch(e.target.value); searchLocation(e.target.value, 'drop'); }}
                  style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectingFor(selectingFor === 'drop' ? null : 'drop')}
                  style={{ padding: '8px 10px', background: selectingFor === 'drop' ? 'var(--accent)' : undefined }}>🗺️</button>
              </div>
              {searchResults.length > 0 && searchTarget === 'drop' && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, maxHeight: 180, overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                  {searchResults.map((r, i) => (
                    <div key={i} onClick={() => selectLocation(r)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {r.display_name.split(',').slice(0, 3).join(',')}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fare estimate */}
            {pickup && drop && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Distance</span>
                  <span style={{ fontWeight: 600 }}>{distance.toFixed(2)} km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Estimated Fare</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem' }}>₹{fare}</span>
                </div>
              </div>
            )}

            <button className="btn btn-primary btn-lg w-full" onClick={bookRide} disabled={!pickup || !drop || loading}>
              {loading ? <><span className="spinner" /> Finding drivers...</> : '🏍️ Book Ride'}
            </button>
          </div>
        )}

        {/* TRACKING TAB */}
        {tab === 'tracking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: '1.1rem' }}>Live Tracking</h3>
            {activeRide ? (
              <>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>Ride Status</span>
                    <span className={`badge badge-${activeRide.status}`}>{activeRide.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="loc-row">
                      <div className="loc-dot pickup" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Pickup</div>
                        <div style={{ fontSize: '0.85rem' }}>{activeRide.pickup?.address}</div>
                      </div>
                    </div>
                    <div className="loc-line" style={{ marginLeft: 4 }} />
                    <div className="loc-row">
                      <div className="loc-dot drop" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Drop</div>
                        <div style={{ fontSize: '0.85rem' }}>{activeRide.drop?.address}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {activeRide.driver ? (
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 8 }}>YOUR DRIVER</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🏍️</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{activeRide.driver.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{activeRide.driver.phone}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                          {activeRide.driver.vehicleInfo?.model} • {activeRide.driver.vehicleInfo?.number}
                        </div>
                      </div>
                    </div>
                    {driverLocation && (
                      <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
                        Driver is on the way — tracking live
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text2)' }}>Searching for nearby drivers...</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Fare</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{activeRide.fare}</span>
                </div>

                {(activeRide.status === 'pending' || activeRide.status === 'accepted') && (
                  <button className="btn btn-danger w-full" onClick={cancelRide}>Cancel Ride</button>
                )}

                {activeRide.status === 'completed' && (
                  <div style={{ textAlign: 'center', padding: 16, background: 'rgba(34,197,94,0.1)', borderRadius: 12 }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
                    <p style={{ color: 'var(--green)', fontWeight: 700 }}>Ride Completed!</p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏍️</div>
                <p style={{ color: 'var(--text2)' }}>No active ride</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('book')}>Book a Ride</button>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ fontSize: '1.1rem' }}>Ride History</h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 20 }}>No rides yet</p>
            ) : (
              history.map(ride => (
                <div key={ride._id} className="ride-request-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{new Date(ride.createdAt).toLocaleDateString()}</span>
                    <span className={`badge badge-${ride.status}`}>{ride.status}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>📍 {ride.pickup?.address}</div>
                  <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>🏁 {ride.drop?.address}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text2)' }}>{ride.distance} km</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>₹{ride.fare}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
