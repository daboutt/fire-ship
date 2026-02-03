import { useState, useMemo, useEffect } from 'react';
import Board from './Board';
import { useGameState } from '../hooks/useGameState';
import { usePlayerId } from '../hooks/usePlayerId';
import { useUrlParams } from '../hooks/useUrlParams';
import { useSessionRestoration } from '../hooks/useSessionRestoration';
import './Game.css';
import WaitingRoom from './WaitingRoom';
import WinnerAnnouncement from './WinnerAnnouncement';

export default function Game() {
  const { playerId } = usePlayerId();

  const [inputCode, setInputCode] = useState('');
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const { gameState, error, createGame, cleanGame, joinGame, makeMove, checkRoomValidity } = useGameState(
    roomCode,
    playerId,
  );

  const { value: urlRoomCode, setParam: setUrlRoomCode, clearParam: clearUrlRoomCode } = useUrlParams<string>('room');
  const { isRestoring, restoredRoomCode } = useSessionRestoration(checkRoomValidity);

  // Handle session restoration
  useEffect(() => {
    if (!isRestoring && restoredRoomCode) {
      setRoomCode(restoredRoomCode);
    }
  }, [isRestoring, restoredRoomCode]);

  // Sync room code with URL parameters
  useEffect(() => {
    if (roomCode) {
      setUrlRoomCode(roomCode);
    } else {
      clearUrlRoomCode();
    }
  }, [roomCode, setUrlRoomCode, clearUrlRoomCode]);

  // Determine which player this is
  const playerKey: 'player1' | 'player2' | null = useMemo(() => {
    if (!gameState || !playerId) return null;
    if (gameState.players.player1?.id === playerId) return 'player1';
    if (gameState.players.player2?.id === playerId) return 'player2';
    return null;
  }, [gameState, playerId]);

  const handleCreateGame = async () => {
    const code = await createGame();
    setRoomCode(code);
  };

  const handleJoinGame = async () => {
    if (!inputCode) return;
    const success = await joinGame(inputCode.toUpperCase());
    if (success) {
      setRoomCode(inputCode.toUpperCase());
    }
  };

  const handleCellClick = async (row: number, col: number) => {
    if (!gameState || !roomCode || !playerKey) return;

    // Check if it's the player's turn
    if (gameState.currentTurn !== playerKey) {
      console.log('Not your turn!');
      return;
    }

    const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
    const opponentBoard = gameState.players[opponentKey]?.board;

    // Check if cell was already attacked
    if (opponentBoard && (opponentBoard[row][col] === 'hit' || opponentBoard[row][col] === 'miss')) {
      console.log('Already attacked this cell!');
      return;
    }

    await makeMove(roomCode, playerKey, opponentKey, row, col);
  };

  // Show loading while restoring session
  if (isRestoring) {
    return (
      <div className="app">
        <div className="waiting-room">
          <p>Restoring your game session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="game-error">Error: {error}</div>;
  }

  // Lobby view - no game yet
  if (!roomCode || !gameState) {
    return (
      <div className="app">
        <h2>Fire Ship Battle</h2>
        <div className="lobby">
          <p className="lobby-hint">Start a new game and share the code</p>
          <div className="lobby-section">
            <button onClick={handleCreateGame}>New Game</button>
          </div>
          <div className="lobby-divider">
            <span>OR</span>
          </div>
          <p className="lobby-hint">Enter the code shared by your friend</p>
          <div className="lobby-section lobby-join-section">
            <input
              className="lobby-input-code"
              type="text"
              placeholder="code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
            />
            <button onClick={handleJoinGame}>Join Game</button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for second player
  if (gameState.gameStatus === 'waiting') {
    return (
      <WaitingRoom
        roomCode={roomCode}
        onReturnToLobby={() => {
          setRoomCode(null);
          setInputCode('');
          cleanGame();
        }}
      />
    );
  }

  // Game finished - show winner
  if (gameState.gameStatus === 'finished' && gameState.winner) {
    return (
      <WinnerAnnouncement
        isYouWon={gameState.winner === playerKey}
        onReturnToLobby={() => {
          setRoomCode(null);
          setInputCode('');
        }}
      />
    );
  }

  // Game in progress
  const myBoard = playerKey ? gameState.players[playerKey]?.board : undefined;
  const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
  const opponentBoard = gameState.players[opponentKey]?.board;
  const isMyTurn = gameState.currentTurn === playerKey;
  const opponentConnected = gameState.players[opponentKey]?.connected ?? false;

  return (
    <div className="app">
      <div className="game-info">
        <p>Status: {isMyTurn ? 'Your turn' : "Opponent's turn"}</p>
        <p>
          <strong>-{roomCode}-</strong>
        </p>
      </div>

      <div className="game-boards">
        <Board
          boardData={opponentBoard}
          label="Opponent Board"
          disabled={!isMyTurn}
          isOpponent={true}
          onCellClick={handleCellClick}
        />
        <Board boardData={myBoard} label="Your Board" disabled={true} isOpponent={false} />
      </div>
      <div className="game-info">
        <p>Opponent: {opponentConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      </div>
    </div>
  );
}
