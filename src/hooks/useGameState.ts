import { useEffect, useState, useCallback } from 'react';
import {
  ref,
  set,
  onValue,
  update,
  push,
  DataSnapshot,
  onDisconnect,
  remove,
  get,
} from 'firebase/database';
import { database } from '../firebase';
import {
  createBoardWithShips,
  validateBoard,
} from '../utils/shipPlacement';

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



export function useGameState(roomCode: string | null, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if a room is still valid and playable
  const checkRoomValidity = useCallback(
    async (code: string): Promise<boolean> => {
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
    },
    [],
  );

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    const gameRef = ref(database, `games/${roomCode}`);

    // Determine which player this is
    let playerKey: 'player1' | 'player2' | null = null;

    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    // Set up connection tracking
    const init = async () => {
      try {
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
      } catch (error) {
        console.error('Error setting up connection tracking:', error);
      }

      if (isCancelled) {
        return;
      }

      // Listen for game state changes
      unsubscribe = onValue(
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
              remove(gameRef).catch((error) => {
                console.error('Error deleting room:', error);
              });
            }
          }
        },
        (error) => {
          console.error('Firebase error:', error);
          setError(error.message);
        },
      );
    };

    void init();

    return () => {
      isCancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [roomCode, playerId]);

  const cleanGame = useCallback(async () => {
    if (!roomCode) return;

    const gameRef = ref(database, `games/${roomCode}`);

    // Determine which player this is and mark them as disconnected.
    let playerKey: 'player1' | 'player2' | null = null;

    try {
      const snapshot = await get(gameRef);

      const data = snapshot.val();
      if (!data) {
        return;
      }

      if (data.players?.player1?.id === playerId) {
        playerKey = 'player1';
      } else if (data.players?.player2?.id === playerId) {
        playerKey = 'player2';
      }

      if (!playerKey) {
        return;
      }

      const otherPlayerKey = playerKey === 'player1' ? 'player2' : 'player1';
      const otherPlayerConnected = data.players?.[otherPlayerKey]?.connected;

      // Mark this player as disconnected.
      await update(gameRef, {
        [`players/${playerKey}/connected`]: false,
      });

      // If no other player is connected, clean up the entire game.
      if (!otherPlayerConnected) {
        await remove(gameRef);
      }
    } catch (error) {
      console.error('Error cleaning game:', error);
    }
  }, [roomCode, playerId]);
  // Create a new game room
  const createGame = async (): Promise<string> => {
    const gamesRef = ref(database, 'games');
    
    // Generate a unique room code
    let generatedRoomCode: string = '';
    let roomExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to find a unique room code
    while (roomExists && attempts < maxAttempts) {
      // Use timestamp + random chars for better uniqueness
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 5);
      generatedRoomCode = (timestamp + random).substring(0, 6).toUpperCase();

      // Check if room already exists
      const roomRef = ref(database, `games/${generatedRoomCode}`);
      const snapshot = await get(roomRef);
      roomExists = snapshot.exists();
      attempts++;
    }

    // Fallback to push key if we couldn't find a unique code
    if (roomExists) {
      const newGameRef = push(gamesRef);
      generatedRoomCode = newGameRef.key!.substring(0, 6).toUpperCase();
    }

    // Create board with ships for player 1
    const { board: boardWithShips, allShipsPlaced } = createBoardWithShips();

    if (!allShipsPlaced) {
      console.warn('Not all ships were placed successfully');
    }

    const initialGameState: GameState = {
      roomCode: generatedRoomCode,
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

    await set(ref(database, `games/${generatedRoomCode}`), initialGameState);
    return generatedRoomCode;
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
        // Validate existing board before reusing
        if (!validateBoard(game.players.player2.board)) {
          console.warn(
            'Invalid player2 board detected, creating new board',
          );
          const { board: newBoard, allShipsPlaced } = createBoardWithShips();
          if (!allShipsPlaced) {
            console.warn('Not all ships were placed successfully');
          }
          await update(gameRef, {
            'players/player2': {
              id: playerId,
              board: newBoard,
              ready: true,
              connected: true,
            },
            gameStatus: 'playing',
            currentTurn: game.currentTurn || 'player1',
          });
          return true;
        }

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
        // Validate existing board before reusing
        if (!validateBoard(game.players.player1.board)) {
          console.warn(
            'Invalid player1 board detected, creating new board',
          );
          const { board: newBoard, allShipsPlaced } = createBoardWithShips();
          if (!allShipsPlaced) {
            console.warn('Not all ships were placed successfully');
          }
          await update(gameRef, {
            'players/player1': {
              id: playerId,
              board: newBoard,
              ready: true,
              connected: true,
            },
            gameStatus: 'playing',
            currentTurn: game.currentTurn || 'player1',
          });
          return true;
        }

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
      const { board: boardWithShips, allShipsPlaced } = createBoardWithShips();

      if (!allShipsPlaced) {
        console.warn('Not all ships were placed successfully');
      }

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

    // Use transaction-based update to avoid race conditions
    const cellRef = ref(
      database,
      `games/${roomCode}/players/${opponentKey}/board/${row}/${col}`,
    );

    try {
      // Check the current cell status
      const cellSnapshot = await get(cellRef);
      const currentCellStatus = cellSnapshot.val();

      // Don't allow attacking already attacked cells
      if (currentCellStatus === 'hit' || currentCellStatus === 'miss') {
        console.log('Cell already attacked');
        return;
      }

      // Check if cell has a ship
      const isHit = currentCellStatus === 'ship';
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
    } catch (error) {
      console.error('Error making move:', error);
    }
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
