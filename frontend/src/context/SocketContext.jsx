import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socket) { socket.disconnect(); setSocket(null); }
      return;
    }

    const s = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket']
    });

    s.on('connect', () => { setConnected(true); console.log('Socket connected'); });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err) => console.error('Socket error:', err.message));

    setSocket(s);
    return () => { s.disconnect(); };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
