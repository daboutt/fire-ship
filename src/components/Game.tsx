import { useState, useEffect, useMemo, useCallback } from "react";
import Board from "./Board";
import { useGameState } from "../hooks/useGameState";
import type { GameState } from "../hooks/useGameState";
import WaitingRoom from "./WaitingRoom";
import "./Game.css";

const PLAYER_ID_KEY = "battleship_player_id";

type PlayerKey = "player1" | "player2";

function getOrCreatePlayerId(): string {
  const stored = localStorage.getItem(PLAYER_ID_KEY);
  if (stored) return stored;

  const newId = `player-${crypto.randomUUID()}`;
  localStorage.setItem(PLAYER_ID_KEY, newId);
  return newId;
}

function getOpponentKey(key: PlayerKey): PlayerKey {
  return key === "player1" ? "player2" : "player1";
}

// --- Sub-components ---

function LoadingScreen() {
  return (
    <div className="app">
      <div className="waiting-room">
        <p>Restoring your game session...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return <div className="game-error">Error: {message}</div>;
}

interface LobbyProps {
  onCreateGame: () => void;
  inputCode: string;
  onInputCodeChange: (value: string) => void;
  onJoinGame: () => void;
}

function Lobby({ onCreateGame, inputCode, onInputCodeChange, onJoinGame }: LobbyProps) {
  return (
    <div className="app">
      <h2>Fire Ship Battle</h2>
      <div className="lobby">
        <p className="lobby-hint">Start a new game and share the code</p>
        <div className="lobby-section">
          <button onClick={onCreateGame}>New Game</button>
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
            onChange={(e) => onInputCodeChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onJoinGame()}
            maxLength={6}
          />
          <button onClick={onJoinGame}>Join Game</button>
        </div>
      </div>
    </div>
  );
}

interface FinishedScreenProps {
  youWon: boolean;
  onReturnToLobby: () => void;
}

function FinishedScreen({ youWon, onReturnToLobby }: FinishedScreenProps) {
  return (
    <div className="app">
      <div className="waiting-room">
        <h2 className="finished-title">{youWon ? "🎉 Victory!" : "💔 Defeat"}</h2>
        <div className={`finished-message ${youWon ? "finished-win" : "finished-lose"}`}>
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
        <div className="lobby-divider">Game Over</div>
        <button onClick={onReturnToLobby} className="return-lobby-btn">
          Return to Lobby
        </button>
      </div>
    </div>
  );
}

interface ActiveGameProps {
  gameState: GameState;
  playerKey: PlayerKey;
  roomCode: string;
  onCellClick: (row: number, col: number) => void;
}

function ActiveGame({ gameState, playerKey, roomCode, onCellClick }: ActiveGameProps) {
  const opponentKey = getOpponentKey(playerKey);
  const myBoard = gameState.players[playerKey]?.board as any;
  const opponentBoard = gameState.players[opponentKey]?.board as any;
  const isMyTurn = gameState.currentTurn === playerKey;
  const opponentConnected = gameState.players[opponentKey]?.connected ?? false;

  // This is a line for new year 26, best wishes
  return (
    <div className="app">
      <div className="game-info">
        <p>Status: {isMyTurn ? "Your turn" : "Opponent's turn"}</p>
        <p>
          <strong>-{roomCode}-</strong>
        </p>
      </div>

      <div className="game-boards">
        <Board
          boardData={opponentBoard}
          label="Opponent Board"
          disabled={!isMyTurn}
          isOpponent
          onCellClick={onCellClick}
        />
        <Board boardData={myBoard} label="Your Board" disabled isOpponent={false} />
      </div>

      <div className="game-info">
        <p>Opponent: {opponentConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
      </div>
    </div>
  );
}

// --- Main component ---

export default function Game() {
  const [playerId] = useState(getOrCreatePlayerId);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const { gameState, error, createGame, cleanGame, joinGame, makeMove, checkRoomValidity } = useGameState(
    roomCode,
    playerId
  );

  const playerKey = useMemo<PlayerKey | null>(() => {
    if (!gameState) return null;
    if (gameState.players.player1?.id === playerId) return "player1";
    if (gameState.players.player2?.id === playerId) return "player2";
    return null;
  }, [gameState, playerId]);

  const handleCreateGame = useCallback(async () => {
    const code = await createGame();
    setRoomCode(code);
  }, [createGame]);

  const handleJoinGame = useCallback(async () => {
    const normalized = inputCode.toUpperCase();
    if (!normalized) return;

    const success = await joinGame(normalized);
    if (success) {
      setRoomCode(normalized);
    }
  }, [inputCode, joinGame]);

  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      if (!gameState || !roomCode || !playerKey) return;
      if (gameState.currentTurn !== playerKey) return;

      const opponentKey = getOpponentKey(playerKey);
      const opponentBoard = gameState.players[opponentKey]?.board;

      if (opponentBoard?.[row][col] === "hit" || opponentBoard?.[row][col] === "miss") return;

      await makeMove(roomCode, playerKey, opponentKey, row, col);
    },
    [gameState, roomCode, playerKey, makeMove]
  );

  const handleReturnToLobby = useCallback(() => {
    setRoomCode(null);
    setInputCode("");
    cleanGame();
    window.history.replaceState({}, "", window.location.pathname);
  }, [cleanGame]);

  // Restore session from URL on mount
  useEffect(() => {
    const restoreSession = async () => {
      const urlRoomCode = new URLSearchParams(window.location.search).get("room");

      if (urlRoomCode) {
        const isValid = await checkRoomValidity(urlRoomCode);
        if (isValid) {
          setRoomCode(urlRoomCode);
        } else {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }

      setIsRestoringSession(false);
    };

    restoreSession();
  }, [checkRoomValidity]);

  // Sync room code to URL
  useEffect(() => {
    if (roomCode) {
      const params = new URLSearchParams(window.location.search);
      params.set("room", roomCode);
      window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    } else {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [roomCode]);

  if (isRestoringSession) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  if (!roomCode || !gameState) {
    return (
      <Lobby
        onCreateGame={handleCreateGame}
        inputCode={inputCode}
        onInputCodeChange={setInputCode}
        onJoinGame={handleJoinGame}
      />
    );
  }

  if (gameState.gameStatus === "waiting") {
    return <WaitingRoom roomCode={roomCode} onReturnToLobby={handleReturnToLobby} />;
  }

  if (gameState.gameStatus === "finished" && gameState.winner) {
    return <FinishedScreen youWon={gameState.winner === playerKey} onReturnToLobby={handleReturnToLobby} />;
  }

  if (!playerKey) return <ErrorScreen message="Unable to determine your player slot" />;

  return <ActiveGame gameState={gameState} playerKey={playerKey} roomCode={roomCode} onCellClick={handleCellClick} />;
}
