import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'owner', phone: '', vehicleType: '', vehicleNumber: '', vehicleModel: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, password: form.password,
        role: form.role, phone: form.phone,
        ...(form.role === 'driver' && { vehicleInfo: { type: form.vehicleType, number: form.vehicleNumber, model: form.vehicleModel } })
      };
      await register(payload);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '2.8rem', marginBottom: 8 }}>
            Rapido<span style={{ color: 'var(--accent)' }}>X</span>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Create your account</p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.4rem', marginBottom: 24 }}>Join RapidoX</h2>

          {/* Role Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            {['owner', 'driver'].map(r => (
              <button key={r} type="button" onClick={() => upd('role', r)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s', background: form.role === r ? 'var(--accent)' : 'transparent', color: form.role === r ? 'white' : 'var(--text2)' }}>
                {r === 'owner' ? '🧑 Owner' : '🏍️ Driver'}
              </button>
            ))}
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem', color: 'var(--red)' }}>{error}</div>}

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Full Name</label>
                <input className="input-field" placeholder="John Doe" value={form.name} onChange={e => upd('name', e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Phone</label>
                <input className="input-field" placeholder="+91 9876543210" value={form.phone} onChange={e => upd('phone', e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>Email</label>
              <input className="input-field" type="email" placeholder="your@email.com" value={form.email} onChange={e => upd('email', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input-field" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => upd('password', e.target.value)} required minLength={6} />
            </div>

            {form.role === 'driver' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Vehicle Info</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label>Type</label>
                    <select className="input-field" value={form.vehicleType} onChange={e => upd('vehicleType', e.target.value)}>
                      <option value="">Select</option>
                      <option value="bike">Bike</option>
                      <option value="auto">Auto</option>
                      <option value="car">Car</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Number</label>
                    <input className="input-field" placeholder="KA01AB1234" value={form.vehicleNumber} onChange={e => upd('vehicleNumber', e.target.value)} />
                  </div>
                </div>
                <div className="input-group" style={{ marginTop: 12 }}>
                  <label>Model</label>
                  <input className="input-field" placeholder="Honda Activa" value={form.vehicleModel} onChange={e => upd('vehicleModel', e.target.value)} />
                </div>
              </div>
            )}

            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text2)', fontSize: '0.875rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
