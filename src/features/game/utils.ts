import { PLAYER_ID_KEY, SHIPS } from "./constants";
import type { CellStatus, ShipId, ShipInfo } from "./types";

export function getOrCreatePlayerId(): string {
  const stored = localStorage.getItem(PLAYER_ID_KEY);
  if (stored) return stored;

  const newId = `player-${crypto.randomUUID()}`;
  localStorage.setItem(PLAYER_ID_KEY, newId);
  return newId;
}

// Helper function to create a board with randomly placed ships and return placement status
export function createBoardWithShips(): {
  board: CellStatus[][];
  ships: Record<ShipId, ShipInfo>;
  allShipsPlaced: boolean;
} {
  const board: CellStatus[][] = Array.from({ length: 10 }, () => Array(10).fill("empty"));
  const ships: Record<ShipId, ShipInfo> = {};
  let shipIdCounter = 0;

  let allShipsPlaced = true;

  // Helper to check if placement is valid
  const canPlaceShip = (row: number, col: number, size: number, isHorizontal: boolean): boolean => {
    if (isHorizontal) {
      if (col + size > 10) return false;
      for (let i = 0; i < size; i++) {
        if (board[row][col + i] !== "empty") return false;
      }
    } else {
      if (row + size > 10) return false;
      for (let i = 0; i < size; i++) {
        if (board[row + i][col] !== "empty") return false;
      }
    }
    return true;
  };

  // Place ships randomly
  SHIPS.forEach(({ size, count }) => {
    for (let ship = 0; ship < count; ship++) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        const isHorizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);

        if (canPlaceShip(row, col, size, isHorizontal)) {
          // Generate unique ship ID
          const shipId = `ship-${shipIdCounter++}` as ShipId;
          ships[shipId] = { id: shipId, size, hits: 0 };

          if (isHorizontal) {
            for (let i = 0; i < size; i++) {
              board[row][col + i] = shipId;
            }
          } else {
            for (let i = 0; i < size; i++) {
              board[row + i][col] = shipId;
            }
          }
          placed = true;
        }
        attempts++;
      }

      if (!placed) {
        console.warn(`Failed to place ship of size ${size} after ${maxAttempts} attempts`);
        allShipsPlaced = false;
      }
    }
  });

  return { board, ships, allShipsPlaced };
}

// Validate that a board has ships placed correctly
export function validateBoard(board: CellStatus[][]): boolean {
  if (!board || board.length !== 10) return false;

  for (const row of board) {
    if (!row || row.length !== 10) return false;
  }

  // Count ships on the board (cells that are not 'empty', 'hit', or 'miss')
  let shipCount = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== "empty" && cell !== "hit" && cell !== "miss") {
        shipCount++;
      }
    }
  }

  // Calculate expected ship count
  const expectedShipCount = SHIPS.reduce((sum, ship) => sum + ship.size * ship.count, 0);

  return shipCount === expectedShipCount;
}
