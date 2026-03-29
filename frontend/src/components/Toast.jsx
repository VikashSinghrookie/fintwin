import { useState, useEffect } from 'react';

let toastTimeout = null;
let setGlobalMsg = null;

export function showToast(msg) {
  if (setGlobalMsg) {
    setGlobalMsg(msg);
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => setGlobalMsg(''), 2500);
  }
}

export default function Toast() {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setGlobalMsg = setMsg;
    return () => { setGlobalMsg = null; };
  }, []);

  if (!msg) return null;

  return (
    <div className="toast-container">
      <div className="toast">{msg}</div>
    </div>
  );
}
