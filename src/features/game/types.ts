export enum Player {
  Player1,
  Player2,
}

export type PlayerKey = "player1" | "player2";

export type ShipId = `ship-${number}`;

export type CellStatus = "empty" | "hit" | "miss" | ShipId;

export interface ShipInfo {
  id: ShipId;
  size: number;
  hits: number;
}

export type Ship = {
  size: number;
  count: number;
};
export interface PlayerState {
  id: string;
  board: CellStatus[][];
  ships?: Record<ShipId, ShipInfo>;
  ready: boolean;
  connected: boolean;
}

export interface GameState {
  roomCode: string;
  players: {
    player1?: PlayerState;
    player2?: PlayerState;
  };
  currentTurn?: PlayerKey;
  gameStatus: "waiting" | "setup" | "playing" | "finished";
  winner?: PlayerKey;
}
