import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MapView from '../components/MapView';
import Toast, { showToast } from '../components/Toast';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function DriverDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [isAvailable, setIsAvailable] = useState(false);
  const [rideRequests, setRideRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [tab, setTab] = useState('requests');
  const gpsInterval = useRef(null);

  // Fetch pending rides and any active ride
  useEffect(() => {
    fetchPendingRides();
    fetchActiveRide();
  }, []);

  const fetchPendingRides = async () => {
    try {
      const res = await axios.get('/api/rides/pending');
      setRideRequests(res.data.rides);
    } catch {}
  };

  const fetchActiveRide = async () => {
    try {
      const res = await axios.get('/api/rides/driver-active');
      if (res.data.ride) {
        setActiveRide(res.data.ride);
        setTab('active');
        setIsAvailable(true);
        startGPS(res.data.ride._id);
      }
    } catch {}
  };

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('ride:newRequest', ({ ride }) => {
      setRideRequests(prev => [ride, ...prev.filter(r => r._id !== ride._id)]);
      showToast('New ride request! 🏍️', 'info');
    });

    socket.on('ride:taken', ({ rideId }) => {
      setRideRequests(prev => prev.filter(r => r._id !== rideId));
    });

    socket.on('driver:rideAccepted', ({ ride }) => {
      setActiveRide(ride);
      setTab('active');
      startGPS(ride._id);
      showToast('Ride accepted! Head to pickup 📍', 'success');
    });

    socket.on('ride:cancelled', ({ rideId }) => {
      if (activeRide?._id === rideId) {
        setActiveRide(null);
        stopGPS();
        setTab('requests');
        showToast('Ride was cancelled by owner', 'error');
      }
    });

    socket.on('error', ({ message }) => showToast(message, 'error'));

    return () => {
      socket.off('ride:newRequest'); socket.off('ride:taken');
      socket.off('driver:rideAccepted'); socket.off('ride:cancelled'); socket.off('error');
    };
  }, [socket, activeRide]);

  const toggleAvailable = () => {
    const next = !isAvailable;
    setIsAvailable(next);
    socket?.emit('driver:setAvailable', next);
    if (next) {
      showToast('You are now online!', 'success');
      fetchPendingRides();
    } else {
      showToast('You are now offline', 'info');
    }
  };

  const acceptRide = (rideId) => {
    if (!socket) return showToast('Not connected', 'error');
    socket.emit('driver:acceptRide', { rideId });
  };

  const startGPS = (rideId) => {
    stopGPS();
    const sendLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setDriverLocation(loc);
            socket?.emit('driver:locationUpdate', { lat: loc.lat, lng: loc.lng, rideId });
          },
          () => {
            // Simulate movement if GPS not available (for demo)
            setDriverLocation(prev => {
              if (!prev) return { lat: 12.9716, lng: 77.5946 };
              return { lat: prev.lat + (Math.random() - 0.5) * 0.001, lng: prev.lng + (Math.random() - 0.5) * 0.001 };
            });
          }
        );
      } else {
        // Simulate movement
        setDriverLocation(prev => {
          const loc = prev || { lat: 12.9716, lng: 77.5946 };
          const next = { lat: loc.lat + (Math.random() - 0.5) * 0.001, lng: loc.lng + (Math.random() - 0.5) * 0.001 };
          socket?.emit('driver:locationUpdate', { lat: next.lat, lng: next.lng, rideId });
          return next;
        });
      }
    };
    sendLocation();
    gpsInterval.current = setInterval(sendLocation, 3000);
  };

  const stopGPS = () => {
    if (gpsInterval.current) { clearInterval(gpsInterval.current); gpsInterval.current = null; }
  };

  useEffect(() => () => stopGPS(), []);

  const startRide = () => {
    socket?.emit('driver:startRide', { rideId: activeRide._id });
    setActiveRide(prev => ({ ...prev, status: 'in_progress' }));
    showToast('Ride started!', 'success');
  };

  const completeRide = () => {
    socket?.emit('driver:completeRide', { rideId: activeRide._id });
    stopGPS();
    setActiveRide(null);
    setDriverLocation(null);
    setTab('requests');
    fetchPendingRides();
    showToast('Ride completed! 🎉', 'success');
  };

  return (
    <>
      <Toast />
      <div className="map-panel">
        <MapView driverLocation={driverLocation} pickup={activeRide?.pickup} drop={activeRide?.drop} />
      </div>

      <div className="side-panel">
        {/* Availability Toggle */}
        <div style={{ background: isAvailable ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', border: `1px solid ${isAvailable ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.95rem' }}>
              {isAvailable ? '🟢 Online' : '⭕ Offline'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>
              {isAvailable ? 'Receiving ride requests' : 'Tap to go online'}
            </div>
          </div>
          <button onClick={toggleAvailable}
            style={{ width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', background: isAvailable ? 'var(--green)' : 'var(--border)', position: 'relative', transition: 'all 0.3s' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: isAvailable ? 27 : 3, transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          </button>
        </div>

        {/* Driver Info */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 700 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{user?.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
                {user?.vehicleInfo?.model} • {user?.vehicleInfo?.number}
              </div>
            </div>
          </div>
          {driverLocation && (
            <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text2)' }}>
              📡 GPS: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 10, padding: 4 }}>
          {[['requests', '📋 Requests'], ['active', '🚀 Active Ride']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s', background: tab === k ? 'var(--accent)' : 'transparent', color: tab === k ? 'white' : 'var(--text2)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* REQUESTS TAB */}
        {tab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem' }}>Ride Requests</h3>
              <button className="btn btn-ghost btn-sm" onClick={fetchPendingRides}>↻ Refresh</button>
            </div>
            {!isAvailable ? (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>😴</div>
                <p style={{ color: 'var(--text2)' }}>Go online to receive requests</p>
              </div>
            ) : rideRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>🔍</div>
                <p style={{ color: 'var(--text2)' }}>No ride requests right now</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 6 }}>Requests will appear here in real-time</p>
              </div>
            ) : (
              rideRequests.map(ride => (
                <div key={ride._id} className="ride-request-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ride.owner?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{ride.owner?.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem' }}>₹{ride.fare}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{ride.distance} km</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    <div className="loc-row">
                      <div className="loc-dot pickup" />
                      <div style={{ fontSize: '0.82rem' }}>{ride.pickup?.address}</div>
                    </div>
                    <div className="loc-row">
                      <div className="loc-dot drop" />
                      <div style={{ fontSize: '0.82rem' }}>{ride.drop?.address}</div>
                    </div>
                  </div>
                  <button className="btn btn-success w-full btn-sm" onClick={() => acceptRide(ride._id)}>
                    Accept Ride
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ACTIVE RIDE TAB */}
        {tab === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: '1rem' }}>Active Ride</h3>
            {activeRide ? (
              <>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>Status</span>
                    <span className={`badge badge-${activeRide.status}`}>{activeRide.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 4 }}>CUSTOMER</div>
                    <div style={{ fontWeight: 600 }}>{activeRide.owner?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{activeRide.owner?.phone}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="loc-row">
                      <div className="loc-dot pickup" />
                      <div><div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>PICKUP</div><div style={{ fontSize: '0.85rem' }}>{activeRide.pickup?.address}</div></div>
                    </div>
                    <div className="loc-row">
                      <div className="loc-dot drop" />
                      <div><div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>DROP</div><div style={{ fontSize: '0.85rem' }}>{activeRide.drop?.address}</div></div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '8px 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Fare</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem' }}>₹{activeRide.fare}</span>
                  </div>
                </div>

                {driverLocation && (
                  <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: 10, fontSize: '0.8rem', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />
                    Broadcasting live location to customer
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeRide.status === 'accepted' && (
                    <button className="btn btn-primary w-full" onClick={startRide}>
                      🚀 Start Ride
                    </button>
                  )}
                  {activeRide.status === 'in_progress' && (
                    <button className="btn btn-success w-full" onClick={completeRide}>
                      ✅ Complete Ride
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏍️</div>
                <p style={{ color: 'var(--text2)' }}>No active ride</p>
                <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setTab('requests')}>View Requests</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
