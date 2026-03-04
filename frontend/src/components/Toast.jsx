import { useState, useEffect } from 'react';

let toastFn;

export const showToast = (msg, type = 'info') => {
  if (toastFn) toastFn(msg, type);
};

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastFn = (msg, type) => {
      const id = Date.now();
      setToasts(t => [...t, { id, msg, type }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    };
  }, []);

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span style={{ fontSize: '1.1rem' }}>{icons[t.type]}</span>
          <span style={{ fontSize: '0.9rem' }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
