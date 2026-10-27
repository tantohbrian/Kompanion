import { useEffect } from 'react';
import { handleKeyDown } from './registry';

/**
 * Attaches the central shortcut listener to window with cleanup on unmount.
 */
export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
