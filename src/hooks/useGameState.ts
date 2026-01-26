import { useEffect, useState } from 'react';
import {
  ref,
  set,
  onValue,
  update,
  push,
  DataSnapshot,
  onDisconnect,
  remove,
} from 'firebase/database';
import { database } from '../firebase';

export type CellStatus = 'empty' | 'ship' | 'hit' | 'miss';

export interface GameState {
  roomCode: string;
  players: {
    player1?: {
      id: string;
      board: CellStatus[][];
      ready: boolean;
      connected: boolean;
    };
    player2?: {
      id: string;
      board: CellStatus[][];
      ready: boolean;
      connected: boolean;
    };
  };
  currentTurn?: 'player1' | 'player2';
  gameStatus: 'waiting' | 'setup' | 'playing' | 'finished';
  winner?: 'player1' | 'player2';
}

// Helper function to create a board with randomly placed ships
const createBoardWithShips = (): CellStatus[][] => {
  const board: CellStatus[][] = Array.from({ length: 10 }, () =>
    Array(10).fill('empty'),
  );

  // Ships to place: [size, count]
  const ships = [
    { size: 4, count: 1 }, // Battleship
    { size: 3, count: 2 }, // Cruiser x2
    { size: 2, count: 1 }, // Destroyer
  ];

  // Helper to check if placement is valid
  const canPlaceShip = (
    row: number,
    col: number,
    size: number,
    isHorizontal: boolean,
  ): boolean => {
    if (isHorizontal) {
      if (col + size > 10) return false;
      for (let i = 0; i < size; i++) {
        if (board[row][col + i] !== 'empty') return false;
      }
    } else {
      if (row + size > 10) return false;
      for (let i = 0; i < size; i++) {
        if (board[row + i][col] !== 'empty') return false;
      }
    }
    return true;
  };

  // Place ships randomly
  ships.forEach(({ size, count }) => {
    for (let ship = 0; ship < count; ship++) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        const isHorizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);

        if (canPlaceShip(row, col, size, isHorizontal)) {
          if (isHorizontal) {
            for (let i = 0; i < size; i++) {
              board[row][col + i] = 'ship';
            }
          } else {
            for (let i = 0; i < size; i++) {
              board[row + i][col] = 'ship';
            }
          }
          placed = true;
        }
        attempts++;
      }
    }
  });

  return board;
};

export function useGameState(roomCode: string | null, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if a room is still valid and playable
  const checkRoomValidity = async (code: string): Promise<boolean> => {
    try {
      const gameRef = ref(database, `games/${code}`);
      const snapshot = await new Promise<DataSnapshot>((resolve, reject) => {
        onValue(gameRef, resolve, reject, { onlyOnce: true });
      });

      const game = snapshot.val();
      if (!game) return false;

      // Room exists and game is not finished
      return game.gameStatus !== 'finished';
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    const gameRef = ref(database, `games/${roomCode}`);

    // Determine which player this is
    let playerKey: 'player1' | 'player2' | null = null;

    // Set up connection tracking
    const setupConnectionTracking = async () => {
      const snapshot = await new Promise<DataSnapshot>((resolve, reject) => {
        onValue(gameRef, resolve, reject, { onlyOnce: true });
      });

      const data = snapshot.val();
      if (data) {
        // Determine which player this is
        if (data.players?.player1?.id === playerId) {
          playerKey = 'player1';
        } else if (data.players?.player2?.id === playerId) {
          playerKey = 'player2';
        }

        if (playerKey) {
          const playerConnectedRef = ref(
            database,
            `games/${roomCode}/players/${playerKey}/connected`,
          );

          // Mark as connected
          await set(playerConnectedRef, true);

          // Set up onDisconnect handler to mark as disconnected
          const disconnectRef = onDisconnect(playerConnectedRef);
          await disconnectRef.set(false);
        }
      }
    };

    setupConnectionTracking();

    // Listen for game state changes
    const unsubscribe = onValue(
      gameRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setGameState(data);

          // Check if both players are disconnected and delete room
          const player1Connected = data.players?.player1?.connected ?? false;
          const player2Connected = data.players?.player2?.connected ?? false;
          if (!player1Connected && !player2Connected) {
            console.log('Both players disconnected, deleting room...');
            remove(gameRef).catch(console.error);
          }
        }
      },
      (error) => {
        console.error('Firebase error:', error);
        setError(error.message);
      },
    );

    return () => unsubscribe();
  }, [roomCode, playerId]);

  const cleanGame = () => {
    const gameRef = ref(database, `games/${roomCode}`);

    // Determine which player this is
    let playerKey: 'player1' | 'player2' | null = null;

    // Set up connection tracking
    const setupConnectionTracking = async () => {
      const snapshot = await new Promise<DataSnapshot>((resolve, reject) => {
        onValue(gameRef, resolve, reject, { onlyOnce: true });
      });

      const data = snapshot.val();
      if (data) {
        // Determine which player this is
        if (data.players?.player1?.id === playerId) {
          playerKey = 'player1';
        } else if (data.players?.player2?.id === playerId) {
          playerKey = 'player2';
        }

        if (playerKey) {
          const playerConnectedRef = ref(
            database,
            `games/${roomCode}/players/${playerKey}/connected`,
          );

          // Mark as connected
          await set(playerConnectedRef, true);

          // Set up onDisconnect handler to mark as disconnected
          const disconnectRef = onDisconnect(playerConnectedRef);
          await disconnectRef.set(false);
          const otherPlayerStatus =
            playerKey === 'player1'
              ? data.players?.player2?.connected
              : data.players?.player1?.connected;
          if (!otherPlayerStatus) {
            remove(gameRef).catch(console.error);
          }
        }
      }
    };
    setupConnectionTracking();
  };
  // Create a new game room
  const createGame = async (): Promise<string> => {
    const gamesRef = ref(database, 'games');
    const newGameRef = push(gamesRef);
    const roomCode = newGameRef.key!.substring(0, 6).toUpperCase();

    // Create board with ships for player 1
    const boardWithShips = createBoardWithShips();

    const initialGameState: GameState = {
      roomCode,
      players: {
        player1: {
          id: playerId,
          board: boardWithShips,
          ready: true, // Auto-ready since ships are placed
          connected: true,
        },
      },
      gameStatus: 'waiting',
    };

    await set(ref(database, `games/${roomCode}`), initialGameState);
    return roomCode;
  };

  // Join an existing game
  const joinGame = async (code: string): Promise<boolean> => {
    const gameRef = ref(database, `games/${code}`);

    try {
      const snapshot = await new Promise<DataSnapshot>((resolve, reject) => {
        onValue(gameRef, resolve, reject, { onlyOnce: true });
      });

      const game = snapshot.val();

      if (!game) {
        setError('Game not found');
        return false;
      }
      const isAllConnected =
        game.players.player2?.connected && game.players.player1?.connected;
      if (isAllConnected) {
        setError('Game is full');
        return false;
      }
      if (game.players.player2 && !game.players.player2?.connected) {
        await update(gameRef, {
          'players/player2': {
            id: playerId,
            board: game.players.player2.board,
            ready: true, // Auto-ready since ships are placed
            connected: true,
          },
          gameStatus: 'playing', // Start immediately
          currentTurn: game.currentTurn,
        });
        return true;
      }
      if (game.players.player1 && !game.players.player1?.connected) {
        await update(gameRef, {
          'players/player1': {
            id: playerId,
            board: game.players.player1.board,
            ready: true, // Auto-ready since ships are placed
            connected: true,
          },
          gameStatus: 'playing', // Start immediately
          currentTurn: game.currentTurn,
        });
        return true;
      }
      // Create board with ships for player 2
      const boardWithShips = createBoardWithShips();

      await update(gameRef, {
        'players/player2': {
          id: playerId,
          board: boardWithShips,
          ready: true, // Auto-ready since ships are placed
          connected: true,
        },
        gameStatus: 'playing', // Start immediately
        currentTurn: 'player1', // Player 1 (creator) goes first
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Update player's board (for ship placement)
  const updateBoard = async (
    roomCode: string,
    playerKey: 'player1' | 'player2',
    board: CellStatus[][],
  ) => {
    const boardRef = ref(
      database,
      `games/${roomCode}/players/${playerKey}/board`,
    );
    await set(boardRef, board);
  };

  // Mark player as ready
  const setPlayerReady = async (
    roomCode: string,
    playerKey: 'player1' | 'player2',
  ) => {
    const readyRef = ref(
      database,
      `games/${roomCode}/players/${playerKey}/ready`,
    );
    await set(readyRef, true);
  };

  // Make a move (attack opponent's cell)
  const makeMove = async (
    roomCode: string,
    playerKey: 'player1' | 'player2',
    opponentKey: 'player1' | 'player2',
    row: number,
    col: number,
  ) => {
    if (!gameState) return;

    const opponentBoard = gameState.players[opponentKey]?.board;
    if (!opponentBoard) return;

    // Check if cell has a ship
    const isHit = opponentBoard[row][col] === 'ship';
    const newStatus: CellStatus = isHit ? 'hit' : 'miss';

    // Create a copy of the board with the new hit/miss
    const updatedBoard = opponentBoard.map((r, rIdx) =>
      r.map((c, cIdx) => {
        if (rIdx === row && cIdx === col) {
          return newStatus;
        }
        return c;
      }),
    );

    // Check if all ships are destroyed (win condition)
    const allShipsDestroyed = !updatedBoard.some((row) =>
      row.some((cell) => cell === 'ship'),
    );

    // Update the opponent's board
    const updates: Record<string, CellStatus | string> = {};
    updates[`games/${roomCode}/players/${opponentKey}/board/${row}/${col}`] =
      newStatus;

    // Check for win
    if (allShipsDestroyed) {
      updates[`games/${roomCode}/gameStatus`] = 'finished';
      updates[`games/${roomCode}/winner`] = playerKey;
    } else {
      // Only switch turns on a miss - if hit, player keeps their turn
      if (!isHit) {
        const nextTurn = playerKey === 'player1' ? 'player2' : 'player1';
        updates[`games/${roomCode}/currentTurn`] = nextTurn;
      }
    }

    await update(ref(database), updates);
  };

  // Start the game (after both players are ready)
  const startGame = async (roomCode: string) => {
    await update(ref(database, `games/${roomCode}`), {
      gameStatus: 'playing',
      currentTurn: 'player1',
    });
  };

  return {
    gameState,
    error,
    createGame,
    joinGame,
    updateBoard,
    setPlayerReady,
    makeMove,
    startGame,
    checkRoomValidity,
    cleanGame,
  };
}
