import { useState, useEffect } from 'react';
import Board from './Board';
import { useGameState } from '../hooks/useGameState';
import './Game.css';
import WaitingRoom from './WaitingRoom';

// LocalStorage key for player ID only
const PLAYER_ID_KEY = 'battleship_player_id';

export default function Game() {
  // Get or create player ID from localStorage
  const [playerId] = useState(() => {
    const stored = localStorage.getItem(PLAYER_ID_KEY);
    if (stored) return stored;

    const newId = `player-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(PLAYER_ID_KEY, newId);
    return newId;
  });

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const {
    gameState,
    error,
    createGame,
    cleanGame,
    joinGame,
    makeMove,
    checkRoomValidity,
  } = useGameState(roomCode, playerId);

  // Try to restore session from URL params on mount
  useEffect(() => {
    const restoreSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlRoomCode = params.get('room');

      if (urlRoomCode) {
        // Check if room is still valid
        const isValid = await checkRoomValidity(urlRoomCode);
        debugger;
        if (isValid) {
          console.log('Restoring session to room:', urlRoomCode);
          setRoomCode(urlRoomCode);
        } else {
          console.log('Room from URL is no longer valid, clearing...');
          // Remove room param from URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      }

      setIsRestoringSession(false);
    };

    restoreSession();
  }, [checkRoomValidity]);

  // Update URL when room code changes
  useEffect(() => {
    if (roomCode) {
      const params = new URLSearchParams(window.location.search);
      params.set('room', roomCode);
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?${params}`,
      );
    } else {
      // Clear room param from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [roomCode]);

  // Determine which player this is
  const playerKey: 'player1' | 'player2' | null = (() => {
    if (!gameState || !playerId) return null;
    if (gameState.players.player1?.id === playerId) return 'player1';
    if (gameState.players.player2?.id === playerId) return 'player2';
    return null;
  })();

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
    if (
      opponentBoard &&
      (opponentBoard[row][col] === 'hit' || opponentBoard[row][col] === 'miss')
    ) {
      console.log('Already attacked this cell!');
      return;
    }

    await makeMove(roomCode, playerKey, opponentKey, row, col);
  };

  // Show loading while restoring session
  if (isRestoringSession) {
    return (
      <div className='app'>
        <div className='waiting-room'>
          <p>Restoring your game session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className='game-error'>Error: {error}</div>;
  }

  // Lobby view - no game yet
  if (!roomCode || !gameState) {
    return (
      <div className='app'>
        <h2>Fire Ship Battle</h2>
        <div className='lobby'>
          <p className='lobby-hint'>Start a new game and share the code</p>
          <div className='lobby-section'>
            <button onClick={handleCreateGame}>New Game</button>
          </div>
          <div className='lobby-divider'>
            <span>OR</span>
          </div>
          <p className='lobby-hint'>Enter the code shared by your friend</p>
          <div className='lobby-section lobby-join-section'>
            <input
              className='lobby-input-code'
              type='text'
              placeholder='code'
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
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  // Game finished - show winner
  if (gameState.gameStatus === 'finished' && gameState.winner) {
    const youWon = gameState.winner === playerKey;
    return (
      <div className='app'>
        <div className='waiting-room'>
          <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {youWon ? '🎉 Victory!' : '💔 Defeat'}
          </h2>
          <div
            style={{
              fontSize: '1.5rem',
              marginBottom: '2rem',
              color: youWon ? '#4CAF50' : '#ff6b6b',
            }}
          >
            {youWon ? (
              <p>
                <strong>You Win!</strong>
                <br />
                You destroyed all enemy ships! 🚢💥
              </p>
            ) : (
              <p>
                <strong>You Lost!</strong>
                <br />
                Your opponent destroyed all your ships!
              </p>
            )}
          </div>
          <div className='lobby-divider'>Game Over</div>
          <button
            onClick={() => {
              // Clear room code and URL params
              setRoomCode(null);
              setInputCode('');
            }}
            style={{ marginTop: '2rem', fontSize: '1.1rem' }}
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Game in progress
  const myBoard = playerKey ? gameState.players[playerKey]?.board : undefined;
  const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
  const opponentBoard = gameState.players[opponentKey]?.board;
  const isMyTurn = gameState.currentTurn === playerKey;
  const opponentConnected = gameState.players[opponentKey]?.connected ?? false;

  return (
    <div className='app'>
      <h2>Fire Ship Battle</h2>
      <div className='game-info'>
        <p>
          Room: <strong>{roomCode}</strong>
        </p>
        <p>Status: {isMyTurn ? '🎯 Your turn!' : "⏳ Opponent's turn"}</p>
        <p>
          Opponent: {opponentConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
      </div>

      <div className='game-boards'>
        <Board
          boardData={myBoard}
          label='Your Board'
          disabled={true}
          isOpponent={false}
        />
        <Board
          boardData={opponentBoard}
          label='Opponent Board'
          disabled={!isMyTurn}
          isOpponent={true}
          onCellClick={handleCellClick}
        />
      </div>
    </div>
  );
}
