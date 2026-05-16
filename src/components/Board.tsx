import { useState, useMemo, useCallback } from "react";
import "./Board.css";
import { createBoardWithShips } from "../features/game/utils/shipPlacement";
import type { CellStatus } from "../features/game/types";

interface Cell {
  row: number;
  col: number;
  status: CellStatus;
}

interface BoardProps {
  boardData?: CellStatus[][];
  isOpponent?: boolean;
  onCellClick?: (row: number, col: number) => void;
  disabled?: boolean;
  label?: string;
  withShipPlacement?: boolean;
}

export default function Board({
  boardData,
  isOpponent = false,
  onCellClick,
  disabled = false,
  label,
  withShipPlacement = false,
}: BoardProps) {
  // Initialize board with optional ship placement
  const initializeBoard = (): CellStatus[][] => {
    if (withShipPlacement) {
      const { board } = createBoardWithShips();
      return board as CellStatus[][];
    }

    return Array.from({ length: 10 }, () => Array(10).fill("empty"));
  };

  // Local state for interactive board
  const [internalBoard, setInternalBoard] = useState<CellStatus[][]>(initializeBoard);

  // Use provided boardData or internal state
  const currentBoard = boardData ?? internalBoard;

  const grid: Cell[][] = useMemo(
    () =>
      currentBoard.map((row, rowIndex) =>
        row.map((status, colIndex) => ({
          row: rowIndex,
          col: colIndex,
          status,
        }))
      ),
    [currentBoard]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (disabled) return;

      // If external handler provided, use it
      if (onCellClick) {
        onCellClick(row, col);
        return;
      }

      // Otherwise, handle internally (for standalone demo)
      const cell = currentBoard[row][col];

      // Don't allow clicking already attacked cells
      if (cell === "hit" || cell === "miss") {
        return;
      }

      // Update board based on hit or miss
      const newBoard = currentBoard.map((r, rIdx) =>
        r.map((c, cIdx) => {
          if (rIdx === row && cIdx === col) {
            // It's a hit if the cell is not 'empty'
            return c !== "empty" ? "hit" : "miss";
          }
          return c;
        })
      );

      setInternalBoard(newBoard);
    },
    [currentBoard, disabled, onCellClick]
  );

  const getCellClassName = useCallback(
    (cell: Cell) => {
      const classes = ["board-cell"];

      if (cell.status !== "empty" && cell.status !== "hit" && cell.status !== "miss" && !isOpponent) {
        classes.push("board-cell-ship");
      }
      if (cell.status === "hit") {
        classes.push("board-cell-hit");
      }
      if (cell.status === "miss") {
        classes.push("board-cell-miss");
      }
      if (!disabled && isOpponent) {
        classes.push("board-cell-clickable");
      }

      return classes.join(" ");
    },
    [disabled, isOpponent]
  );

  return (
    <div className="board-container">
      {label && <h3 className="board-label">{label}</h3>}
      <div className={`board-grid ${isOpponent ? "board-grid-opponent" : "my-board-grid"}`}>
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell) => (
              <div
                key={`${cell.row}-${cell.col}`}
                className={getCellClassName(cell)}
                onClick={() => handleCellClick(cell.row, cell.col)}
              >
                {cell.status === "hit" && <div className="board-cell-marker hit-marker">✕</div>}
                {cell.status === "miss" && <div className="board-cell-marker miss-marker">○</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
