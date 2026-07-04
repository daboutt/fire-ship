import { describe, it, expect, beforeEach } from "vitest";
import { createBoardWithShips, validateBoard, getOrCreatePlayerId } from "./utils";
import { SHIPS } from "./constants";
import type { CellStatus } from "./types";

const EXPECTED_SHIP_CELLS = SHIPS.reduce((sum, s) => sum + s.size * s.count, 0);
const EXPECTED_SHIP_COUNT = SHIPS.reduce((sum, s) => sum + s.count, 0);

describe("createBoardWithShips", () => {
  it("returns a 10x10 board with exactly the expected number of ship cells and IDs", () => {
    const { board, ships, allShipsPlaced } = createBoardWithShips();

    expect(board).toHaveLength(10);
    for (const row of board) expect(row).toHaveLength(10);

    const shipCells = board.flat().filter((c) => c !== "empty" && c !== "hit" && c !== "miss");
    expect(shipCells).toHaveLength(EXPECTED_SHIP_CELLS);

    const distinctIds = new Set(shipCells);
    expect(distinctIds.size).toBe(EXPECTED_SHIP_COUNT);

    expect(Object.keys(ships)).toHaveLength(EXPECTED_SHIP_COUNT);
    expect(allShipsPlaced).toBe(true);
  });

  it("places every ship contiguously in a single row or column", () => {
    const { board } = createBoardWithShips();

    // Map each ship ID to the cells it occupies.
    const cellsById = new Map<string, { row: number; col: number }[]>();
    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== "empty" && cell !== "hit" && cell !== "miss") {
          const list = cellsById.get(cell) ?? [];
          list.push({ row: r, col: c });
          cellsById.set(cell, list);
        }
      });
    });

    for (const cells of cellsById.values()) {
      const rows = new Set(cells.map((p) => p.row));
      const cols = new Set(cells.map((p) => p.col));
      // Ship lies in one row or one column.
      expect(rows.size === 1 || cols.size === 1).toBe(true);

      if (rows.size === 1) {
        const sortedCols = cells.map((p) => p.col).sort((a, b) => a - b);
        for (let i = 1; i < sortedCols.length; i++) {
          expect(sortedCols[i] - sortedCols[i - 1]).toBe(1);
        }
      } else {
        const sortedRows = cells.map((p) => p.row).sort((a, b) => a - b);
        for (let i = 1; i < sortedRows.length; i++) {
          expect(sortedRows[i] - sortedRows[i - 1]).toBe(1);
        }
      }
    }
  });
});

describe("validateBoard", () => {
  it("accepts a freshly generated board", () => {
    const { board } = createBoardWithShips();
    expect(validateBoard(board)).toBe(true);
  });

  it("rejects an empty board", () => {
    expect(validateBoard([])).toBe(false);
  });

  it("rejects a board with the wrong number of rows", () => {
    const nineRows: CellStatus[][] = Array.from({ length: 9 }, () =>
      Array<CellStatus>(10).fill("empty"),
    );
    expect(validateBoard(nineRows)).toBe(false);
  });

  it("rejects a board with the wrong number of ship cells", () => {
    const board: CellStatus[][] = Array.from({ length: 10 }, () =>
      Array<CellStatus>(10).fill("empty"),
    );
    // Place one fewer than expected (EXPECTED_SHIP_CELLS - 1) ship cells.
    for (let i = 0; i < EXPECTED_SHIP_CELLS - 1; i++) {
      board[0][i] = "ship-0";
    }
    expect(validateBoard(board)).toBe(false);
  });
});

describe("getOrCreatePlayerId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a stable value across calls", () => {
    const first = getOrCreatePlayerId();
    const second = getOrCreatePlayerId();
    expect(first).toBe(second);
  });

  it("generates a fresh ID after storage is cleared", () => {
    const first = getOrCreatePlayerId();
    localStorage.clear();
    const afterClear = getOrCreatePlayerId();
    expect(afterClear).not.toBe(first);
  });
});
