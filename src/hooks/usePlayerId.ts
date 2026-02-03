import { useState } from 'react';
import { PLAYER_ID_KEY } from '../utils/constants';

/**
 * Interface for the usePlayerId hook return value
 */
interface PlayerIdHook {
  playerId: string;
}

/**
 * Custom hook for managing player ID with localStorage persistence.
 * 
 * Generates a unique player ID in the format `player-${uuid}` and stores it
 * in localStorage for persistence across browser sessions. If a player ID
 * already exists in localStorage, it will be restored.
 * 
 * @returns Object containing the persistent player ID
 * 
 * @example
 * ```typescript
 * const { playerId } = usePlayerId();
 * console.log(playerId); // "player-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * ```
 */
export function usePlayerId(): PlayerIdHook {
  const [playerId] = useState(() => {
    // Try to restore from localStorage first
    const stored = localStorage.getItem(PLAYER_ID_KEY);
    if (stored) return stored;
    
    // Generate new UUID and format as player ID
    const guidId = crypto.randomUUID();
    const newId = `player-${guidId}`;
    
    // Persist to localStorage
    localStorage.setItem(PLAYER_ID_KEY, newId);
    return newId;
  });

  return { playerId };
}