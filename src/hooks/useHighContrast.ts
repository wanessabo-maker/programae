import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'evviva:high-contrast';

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const apply = (enabled: boolean) => {
  document.documentElement.classList.toggle('high-contrast', enabled);
};

export function useHighContrast() {
  const [enabled, setEnabled] = useState<boolean>(read);

  useEffect(() => {
    apply(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { highContrast: enabled, setHighContrast: setEnabled, toggleHighContrast: toggle };
}
