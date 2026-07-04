# Fix Plan — Code Audit Remediation

Source: code audit of branch `improve` (2026-07-04). Execute phases in order; tasks within a
phase are independent unless noted. After **every** task run:

```bash
pnpm lint && pnpm build
```

and from Phase 1 onward also `pnpm test` (added in Phase 0). Make one commit per task.

**Global constraints for all tasks**

- Do NOT change the Firebase data schema (`games/{roomCode}/players/{playerKey}/…`).
  Live rooms must keep working mid-deploy.
- Do NOT remove `<StrictMode>` from `src/main.tsx`. Fixes must be StrictMode-safe.
- Keep the existing feature-folder layout: game logic lives in `src/features/game/`.
- The stack (React 19, Vite 7, Firebase RTDB, no router, no state library) is intentionally
  chosen and stays. Do not introduce Next.js, React Router, Redux, TanStack Query, etc.

---

## Phase 0 — Test harness (do this first, everything else is verified against it)

### 0.0 Repair the broken lint gate (prerequisite)

Every task's verification is `pnpm lint && pnpm build`, but `pnpm lint` currently
crashes: commit `27e1a88` ("remove unused package") deleted `eslint-plugin-react-refresh`
from `package.json` while `eslint.config.js` still imports it and uses
`reactRefresh.configs.vite`. The package was not actually unused, so restore it:

- `pnpm add -D eslint-plugin-react-refresh` (pin `^0.4.24` to match the prior version).
- Confirm `pnpm lint` exits 0 with no errors before doing anything else.

**Done when:** `pnpm lint` passes.

### 0.1 Add Vitest + React Testing Library

- `pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- Configure via `vite.config.ts` (`test: { environment: "jsdom" }` with a
  `/// <reference types="vitest/config" />` directive) — do not create a separate
  vitest.config file.
- `@testing-library/react` / `@testing-library/jest-dom` are installed here but NOT wired
  up yet — the Phase 0 tests are pure-function tests that only need `jsdom` (for
  `localStorage`). Defer jest-dom setup to the first component test (Phase 2.2): add
  `src/test/setup.ts` with `import "@testing-library/jest-dom"` and reference it via
  `test: { setupFiles: ["./src/test/setup.ts"] }`, or `toBeInTheDocument` will throw.
- Write tests BEFORE touching game logic, capturing current correct behavior:
  - `src/features/game/utils.test.ts`:
    - `createBoardWithShips` returns a 10×10 board, exactly 12 ship cells
      (1×4 + 2×3 + 1×2 per `SHIPS` in `src/features/game/constants.ts`), 4 distinct ship
      IDs, `allShipsPlaced === true`, and every ship's cells are contiguous in one row/column.
    - `validateBoard` accepts a fresh `createBoardWithShips().board`, rejects `[]`, a 9-row
      board, and a board with 11 ship cells.
    - `getOrCreatePlayerId` returns a stable value across calls (mock `localStorage`).
- Update `CLAUDE.md`: replace "No test suite is configured." with the `pnpm test` command.

**Done when:** `pnpm test` passes; `pnpm lint && pnpm build` still pass.

---

## Phase 1 — Critical correctness bugs

### 1.1 StrictMode / effect-cleanup deletes live rooms

**Problem:** In `src/features/game/hooks/useGameState.ts` the main `useEffect` cleanup
(line ~161) runs `void cleanGame()`. `cleanGame` marks the player disconnected and, if the
opponent is not connected, `remove()`s the whole game node. Under StrictMode's double-mount
this fires immediately after room creation → the room is deleted in dev. It also fires on
every `roomCode`/`playerId`/`cleanGame` identity change.

**Fix:**
1. Delete the `void cleanGame()` call from the effect cleanup. The cleanup must only:
   set `isCancelled = true`, unsubscribe the listener, and `onDisconnect(...).cancel()`
   the handler registered during init (keep a reference to it).
2. Disconnect handling stays with the already-registered
   `onDisconnect(playerConnectedRef).set(false)` (server-side, survives tab close).
3. Explicit leaving stays the job of `cleanGame()`, now called ONLY from
   `handleReturnToLobby` in `src/features/game/Game.tsx`. In `handleReturnToLobby`,
   call `await cleanGame()` BEFORE `setRoomCode("")` (currently after), so it doesn't rely
   on a stale closure, and so the effect cleanup (which no longer cleans the game) is the
   only other thing that runs.
4. Remove `cleanGame` from the effect dependency array (deps become `[roomCode, playerId]`).

**Done when:** with `pnpm dev` + StrictMode, creating a room does NOT delete it (verify in
Firebase console or by a second client joining); closing the tab flips `connected` to
`false`; "Back to Lobby" still marks the player disconnected and removes the room when the
opponent is absent.

### 1.2 Guard the "both disconnected → delete room" timer

**Problem:** Same hook, lines ~128–139: when a snapshot shows both players disconnected,
the client schedules `remove(gameRef)` after 2 s without re-checking. A player reconnecting
inside that window gets the room deleted underneath them. The timeout is also never
cancelled on unmount.

**Fix:** Inside the `setTimeout` callback, `get(gameRef)` again and only `remove()` if the
fresh snapshot still shows both players disconnected (or the room is already gone). Store
the timer ID; clear it in the effect cleanup and whenever a newer snapshot shows any player
connected.

**Done when:** manual test — open two clients, kill both, reopen one within 2 s via the
`?room=` URL: the room must survive and the player reconnect.

### 1.3 Make `makeMove` genuinely atomic with `runTransaction`

**Problem:** `makeMove` (same hook, lines ~351–442) claims to be transactional but does
`get` + `update`. Double-clicks, simultaneous moves, or a stale local `gameState` can
double-apply hits, double-switch turns, or miss/false-trigger the win condition (line ~410
computes the win from the locally cached board, not fresh data).

**Fix:** Rewrite `makeMove` around `runTransaction` (import from `firebase/database`) on the
game root `games/{roomCode}`. Inside the transaction callback (which receives the CURRENT
server value — use only it, never the hook's `gameState`):
1. Abort (`return undefined`) if: game missing, `gameStatus !== "playing"`,
   `currentTurn !== playerKey`, target cell is already `"hit"`/`"miss"`, or opponent
   board/ships missing.
2. Compute `isHit` (cell is neither `"empty"`, `"hit"`, nor `"miss"`), set the cell to
   `"hit"`/`"miss"`, increment `ships[hitShipId].hits` on hit, derive `shipSunk` from
   `hits >= size`.
3. Win check: after applying the cell, no cell on the opponent board is a ship ID
   → `gameStatus = "finished"`, `winner = playerKey`. Otherwise switch `currentTurn` iff
   `!isHit || shipSunk` (preserve current rule: hit-without-sink keeps the turn).
4. Return the mutated game object. Remove the old `get`-then-`update` code entirely.

Keep the signature `(roomCode, playerKey, opponentKey, row, col)` so `Game.tsx` is
unchanged. RTDB may deliver `board` rows as arrays — the existing shape is arrays of
strings, which transactions handle fine; do not restructure.

Add unit tests for the pure decision logic by extracting it into
`src/features/game/utils.ts` as `applyMove(game, playerKey, row, col)` returning the new
game state or `null` (invalid move), and have the transaction callback delegate to it.
Test: miss switches turn, partial hit keeps turn, sinking switches turn, last cell of last
ship finishes the game with correct winner, attacking a `"hit"` cell returns `null`,
attacking out of turn returns `null`.

**Done when:** tests above pass; two-client manual game plays to completion; hammering the
same cell with rapid clicks produces exactly one state change.

### 1.4 Slot reclaiming must verify player identity

**Problem:** `joinGame` (same hook, lines ~222–336) lets ANY joiner take over a
disconnected slot, overwriting its `id` — a stranger inherits the player's board and locks
the original player out. A player entering their own room code can also occupy both slots.

**Fix:** Restructure `joinGame`'s decision order:
1. If `game.players.player1?.id === playerId` or `player2?.id === playerId` → this is a
   rejoin: set that slot's `connected: true` (revalidate its board with `validateBoard`,
   regenerating via `createBoardWithShips` only if invalid) and return `true`. This must
   work regardless of the slot's current `connected` value and must NOT touch the other slot.
2. Else if `player2` does not exist → claim it as a brand-new player (current "create board
   for player 2" branch: new board, `gameStatus: "playing"`, `currentTurn: "player1"`).
3. Else → `setError("Game is full")`, return `false`. Never overwrite a slot whose `id`
   differs from `playerId`, connected or not.

Factor the duplicated "validate board else regenerate + update slot" logic (currently
copy-pasted four times for player1/player2 × valid/invalid) into one helper.

**Done when:** tests/manual — a third browser profile joining a room where player1 is
disconnected gets "Game is full"; the original player1 rejoining via code or `?room=` URL
resumes with their own board; joining your own room code does not create a second slot.

### 1.5 Unguarded array index in `Game.tsx`

`src/features/game/Game.tsx:50`: `opponentBoard?.[row][col]` throws if the row is missing.
Change to `opponentBoard?.[row]?.[col]`.

---

## Phase 2 — Hardening & smaller defects

### 2.1 Unpredictable room codes

`createGame` (hook, lines ~177–188) builds codes from `Date.now().toString(36)` — mostly
sequential and guessable. Replace with 6 chars drawn via `crypto.getRandomValues` from the
alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I/L/O/0/1 confusables). Keep the
existence-check retry loop; drop the `push`-key fallback (with a random code, 10 collisions
in a row means something is broken — surface an error instead). Codes remain 6 chars and
uppercase so `Home.tsx` input handling is unchanged.

### 2.2 Simplify `Board.tsx` and make it accessible

`src/components/Board.tsx`:
- Delete the internal-state/demo path: `internalBoard` state, the `currentBoard` fallback,
  and the internal branch of `handleCellClick` (lines ~26–31, 55–75). Make `boardData` a
  required prop; `onCellClick` stays optional (own board isn't clickable).
- Render each cell as `<button type="button">` instead of `<div onClick>`, with the
  `disabled` attribute driven by the existing `disabled` prop and an `aria-label` like
  `"Row 3, column 5: miss"`. Adjust `src/components/Board.css` so buttons keep the current
  cell appearance (reset border/padding/background as needed).
- `Game.css`/`Board.css` may need `button.board-cell` selectors — verify visually with
  `pnpm dev`.

### 2.3 Invalid HTML in `WaitingRoom.tsx`

Lines ~26–34 nest `<div>`s inside `<p>`. Change the `<p className="lobby-waiting-indicator">`
to a `<div>` (keep the class; check `WaitingRoom.css` doesn't target `p`).

### 2.4 Simplify `checkRoomValidity` / `joinGame` reads

The hook wraps `onValue(..., { onlyOnce: true })` in hand-rolled Promises (lines ~15–17,
~227–229). Replace both with `await get(gameRef)` — same semantics, less code. `get` is
already imported.

---

## Phase 3 — Modernization (stack is current; these are the only real gaps)

### 3.1 React Compiler

- `pnpm add -D babel-plugin-react-compiler`
- `vite.config.ts`: `react({ babel: { plugins: ["babel-plugin-react-compiler"] } })`
- Then remove now-redundant manual memoization: `useMemo`/`useCallback` in
  `src/features/game/Game.tsx` and `src/components/Board.tsx`,
  `useCallback` in `src/components/Home.tsx`. Keep `useMemo(() => getOrCreatePlayerId(), [])`
  in `Game.tsx` — it guards a localStorage side effect, not a render computation.
- Verify: `pnpm build` succeeds and the game plays normally in dev.

### 3.2 Vendor chunk splitting

In `vite.config.ts` add:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        firebase: ["firebase/app", "firebase/database"],
        react: ["react", "react-dom"],
      },
    },
  },
},
```

Verify `pnpm build` emits separate `firebase-*.js` / `react-*.js` chunks.

### 3.3 Dependency updates

- Safe now (minor/patch, single commit): `pnpm update` — brings firebase 12.15, react/
  react-dom 19.2.7, @types/react, eslint-plugin-react-hooks 7.1, typescript-eslint 8.62.
- Majors — one PER commit, run `pnpm lint && pnpm build && pnpm test` between each, revert
  any that fail rather than debugging in-place: `vite@8` + `@vitejs/plugin-react@6`
  (pair them), `eslint@10` + `@eslint/js@10`, `typescript@6`, `globals@17`,
  `@types/node@26`. None are required — the current majors are supported; skip any that
  cause friction.

---

## Phase 4 — Dead code & structure cleanup

### 4.1 Delete unused files (verify zero imports first with grep)

- `src/hooks/useRoomCode.ts` (URL sync is done inline in `Game.tsx`)
- `src/pages/error.tsx`
- Empty directories: `src/screens/`, `src/types/` (and `src/hooks/`, `src/pages/` once
  emptied above)

### 4.2 Relocate Firebase init

Move `src/utils/firebase.ts` → `src/lib/firebase.ts` (delete `src/utils/` if then empty),
update the single import in `src/features/game/hooks/useGameState.ts`, and remove the stale
`// TODO: Replace with your Firebase project configuration` comment (config already comes
from env vars). Update the CLAUDE.md architecture section if it references the old path.

### 4.3 Update CLAUDE.md

After Phases 1–2, refresh CLAUDE.md sections that this plan invalidates: test command
(0.1), reconnection semantics (1.4 — slots are reclaimed only by matching `id`), room
deletion behavior (1.1/1.2), and the file move (4.2).

---

## Known limitation — intentionally NOT in scope

Both clients receive the full opponent board (ship positions) and there is no server-side
move validation: cheating is possible by design. Fixing this requires Firebase security
rules and/or Cloud Functions — a product decision, not a refactor. Do not attempt it as
part of this plan.
