import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import OwnerDashboard from './pages/OwnerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'owner' ? '/owner' : '/driver'} replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ?  <Navigate to={user.role === 'owner' ? '/owner' : '/driver'} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'owner' ? '/owner' : '/driver'} replace /> : <Register />} />
      <Route path="/owner" element={<PrivateRoute role="owner"><div className="app-layout"><Navbar /><div className="main-content"><OwnerDashboard /></div></div></PrivateRoute>} />
      <Route path="/driver" element={<PrivateRoute role="driver"><div className="app-layout"><Navbar /><div className="main-content"><DriverDashboard /></div></div></PrivateRoute>} />
      <Route path="*" element={<Navigate to={user ? (user.role === 'owner' ? '/owner' : '/driver') : '/login'} replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
