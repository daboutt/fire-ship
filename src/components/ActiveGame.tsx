import Board from "./Board";
import type { GameState } from "../features/game/types";
import { Player } from "../features/game/types";

interface ActiveGameProps {
  gameState: GameState;
  playerKey: Player;
  roomCode: string;
  onCellClick: (row: number, col: number) => void;
}

export default function ActiveGame({ gameState, playerKey, roomCode, onCellClick }: ActiveGameProps) {
  const playerKeyStr = playerKey === Player.Player1 ? "player1" : "player2";
  const opponentKeyStr = playerKey === Player.Player1 ? "player2" : "player1";

  const myBoard = gameState.players[playerKeyStr]?.board;
  const opponentBoard = gameState.players[opponentKeyStr]?.board;

  const isMyTurn = gameState.currentTurn === playerKeyStr;
  const opponentConnected = gameState.players[opponentKeyStr]?.connected ?? false;

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
