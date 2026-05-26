import { useState, useEffect, useMemo, useCallback } from "react";
import "./Game.css";
import { useGameState } from "./hooks/useGameState";
import ActiveGame from "../../components/ActiveGame";
import WaitingRoom from "../../components/WaitingRoom";
import Home from "../../components/Home";
import GameFinish from "../../components/GameFinish";
import Loading from "../../components/Loading";
import { Player } from "./types";
import type { PlayerKey } from "./types";
import { getOrCreatePlayerId } from "./utils";

function ErrorScreen({ message }: { message: string }) {
  return <div className="game-error">Error: {message}</div>;
}

export default function Game() {
  const [roomCode, setRoomCode] = useState("");
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const { gameState, error, createGame, cleanGame, makeMove, checkRoomValidity } = useGameState(roomCode, playerId);

  const playerKey = useMemo(() => {
    if (!gameState) return null;
    if (gameState.players.player1?.id === playerId) return Player.Player1;
    if (gameState.players.player2?.id === playerId) return Player.Player2;
    return null;
  }, [gameState, playerId]);

  const playerKeyStr = useMemo<PlayerKey | null>(() => {
    if (playerKey === Player.Player1) return "player1";
    if (playerKey === Player.Player2) return "player2";
    return null;
  }, [playerKey]);

  const handleCreateGame = useCallback(async () => {
    const code = await createGame();
    setRoomCode(code);
  }, [createGame]);

  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      if (!gameState || !roomCode || !playerKeyStr) return;
      if (gameState.currentTurn !== playerKeyStr) return;

      const opponentKeyStr = playerKeyStr === "player1" ? "player2" : "player1";
      const opponentBoard = gameState.players[opponentKeyStr]?.board;

      if (opponentBoard?.[row][col] === "hit" || opponentBoard?.[row][col] === "miss") return;

      await makeMove(roomCode, playerKeyStr, opponentKeyStr, row, col);
    },
    [gameState, roomCode, playerKeyStr, makeMove]
  );

  const handleReturnToLobby = useCallback(async () => {
    setRoomCode("");
    await cleanGame();
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
    if (!roomCode) return;
    const params = new URLSearchParams(window.location.search);
    params.set("room", roomCode);
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
  }, [roomCode]);

  if (isRestoringSession) return <Loading />;
  if (error) return <ErrorScreen message={error} />;

  if (!roomCode || !gameState) {
    return <Home playerId={playerId} roomCode={roomCode} setRoomCode={setRoomCode} onCreateGame={handleCreateGame} />;
  }

  if (gameState.gameStatus === "waiting") {
    return <WaitingRoom roomCode={roomCode} onReturnToLobby={handleReturnToLobby} />;
  }

  if (gameState.gameStatus === "finished" && gameState.winner) {
    return (
      <GameFinish
        youWon={playerKeyStr ? gameState.winner === playerKeyStr : false}
        onReturnToLobby={handleReturnToLobby}
      />
    );
  }

  if (!playerKey) return <ErrorScreen message="Unable to determine your player slot" />;

  return <ActiveGame gameState={gameState} playerKey={playerKey} roomCode={roomCode} onCellClick={handleCellClick} />;
}
