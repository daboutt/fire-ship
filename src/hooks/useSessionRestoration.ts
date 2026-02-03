import { useState, useEffect } from 'react';

/**
 * Interface for the useSessionRestoration hook return value
 */
interface SessionRestorationHook {
  isRestoring: boolean;
  restoredRoomCode: string | null;
}

/**
 * Custom hook for handling session restoration from URL parameters.
 * 
 * Automatically attempts to restore a game session when the component mounts
 * by reading the room code from URL parameters and validating it. Manages
 * loading state during the restoration process.
 * 
 * @param checkValidity - Async function to validate room code existence
 * @returns Object with restoration state and restored room code
 * 
 * @example
 * ```typescript
 * const { isRestoring, restoredRoomCode } = useSessionRestoration(
 *   async (code: string) => await checkRoomValidity(code)
 * );
 * 
 * if (isRestoring) {
 *   return <div>Restoring session...</div>;
 * }
 * 
 * if (restoredRoomCode) {
 *   // Session was successfully restored
 *   setRoomCode(restoredRoomCode);
 * }
 * ```
 */
export function useSessionRestoration(
  checkValidity: (code: string) => Promise<boolean>
): SessionRestorationHook {
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoredRoomCode, setRestoredRoomCode] = useState<string | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlRoomCode = params.get('room');

      if (urlRoomCode) {
        try {
          // Check if room is still valid
          const isValid = await checkValidity(urlRoomCode);
          if (isValid) {
            console.log('Restoring session to room:', urlRoomCode);
            setRestoredRoomCode(urlRoomCode);
          } else {
            console.log('Room from URL is no longer valid, clearing...');
            // Clear invalid room parameter from URL
            window.history.replaceState({}, '', window.location.pathname);
            setRestoredRoomCode(null);
          }
        } catch (error) {
          console.error('Error validating room code during restoration:', error);
          // Clear room parameter on validation error
          window.history.replaceState({}, '', window.location.pathname);
          setRestoredRoomCode(null);
        }
      } else {
        setRestoredRoomCode(null);
      }

      setIsRestoring(false);
    };

    restoreSession();
  }, [checkValidity]);

  return { isRestoring, restoredRoomCode };
}