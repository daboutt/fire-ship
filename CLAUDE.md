# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Type-check + build (tsc -b && vite build)
pnpm lint       # ESLint
pnpm test       # Run unit tests once (vitest run)
pnpm test:watch # Run unit tests in watch mode
pnpm preview    # Preview production build
```

## Environment Setup

Copy `.env.example` to `.env` and fill in all `VITE_FIREBASE_*` values from Firebase Console → Project Settings → General → Your apps. All seven variables are required; the app throws at startup if any are missing.

## Architecture

This is a real-time two-player Battleship game built with React 19, TypeScript, Vite, and Firebase Realtime Database. There is no backend — all game logic runs in the browser and syncs through Firebase.

### Data Flow

```
Game.tsx (orchestrator)
  └─ useGameState (src/features/game/hooks/useGameState.ts)
       └─ Firebase Realtime DB: games/{roomCode}/
            ├─ players/player1/  { id, board, ships, ready, connected }
            └─ players/player2/  { id, board, ships, ready, connected }
```

`Game.tsx` is the single root component. It manages routing between screens by inspecting `gameState.gameStatus` (`"waiting"` → `"playing"` → `"finished"`) and renders the appropriate component: `Home`, `WaitingRoom`, `ActiveGame`, or `GameFinish`.

### Feature Folder

All game logic lives under `src/features/game/`:
- `types.ts` — shared types (`GameState`, `PlayerState`, `CellStatus`, etc.)
- `constants.ts` — ship definitions (`SHIPS`) and `PLAYER_ID_KEY`
- `utils.ts` — `createBoardWithShips` (random placement), `validateBoard`, `getOrCreatePlayerId`
- `hooks/useGameState.ts` — all Firebase reads/writes: `createGame`, `joinGame`, `makeMove`, `cleanGame`, `checkRoomValidity`
- `Game.tsx` / `Game.css` — orchestration and layout

### Player Identity

Players are identified by a UUID stored in `localStorage` under `battleship_player_id`. This persists across page reloads, allowing reconnection to in-progress games. The room code is also synced to the URL (`?room=XXXXXX`) so games can be resumed via direct link.

### Game Mechanics

- **Board**: 10×10 grid. Each cell is `"empty"`, `"hit"`, `"miss"`, or a ship ID (`"ship-0"`, `"ship-1"`, …).
- **Ships**: defined in `constants.ts` — 1×size-4, 2×size-3, 1×size-2. Placed randomly on game creation/join.
- **Turns**: player1 always goes first. A hit on a ship cell keeps the turn; a miss or sinking a ship switches turns.
- **Win condition**: all opponent cells containing ship IDs have been hit.
- **Disconnection**: `onDisconnect` sets `connected: false` in Firebase. If both players disconnect, the room is deleted after a 2-second delay to handle reconnection races.

### Reconnection Logic

When joining via `joinGame`, if a player slot exists but `connected === false`, the rejoining player reclaims that slot (reusing their board). Board validity is checked with `validateBoard` before reuse; a fresh board is generated if invalid.
