---
goal: Refactor session management into reusable custom hooks
version: 1.0
date_created: 2026-02-03
last_updated: 2026-02-03
owner: Development Team
status: 'Planned'
tags: ['refactor', 'hooks', 'architecture', 'clean-code']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan focuses on refactoring the session management logic currently embedded in the `Game.tsx` component. The goal is to extract localStorage operations, URL parameter handling, and player ID management into reusable custom hooks following React best practices and the Single Responsibility Principle.

Currently, `Game.tsx` handles:
- Player ID generation and localStorage persistence (lines 10-17)
- URL parameter reading and restoration (lines 29-51)
- URL parameter updates (lines 54-63)
- Manual cleanup of URL state in multiple locations

This refactoring will improve code maintainability, testability, and reusability while reducing the complexity of the `Game` component.

## 1. Requirements & Constraints

**Requirements:**
- **REQ-001**: Extract player ID management into a dedicated custom hook `usePlayerId`
- **REQ-002**: Extract URL parameter management into a dedicated custom hook `useUrlParams`
- **REQ-003**: Extract session restoration logic into a dedicated custom hook `useSessionRestoration`
- **REQ-004**: Maintain backward compatibility with existing functionality
- **REQ-005**: All hooks must follow React hooks rules (no conditional calls, proper dependencies)
- **REQ-006**: Hooks must be independently testable
- **REQ-007**: Maintain type safety with TypeScript
- **REQ-008**: No changes to external APIs or Firebase integration

**Constraints:**
- **CON-001**: Must use localStorage for player ID persistence
- **CON-002**: Must use URL parameters for room code sharing
- **CON-003**: Cannot break existing game state management from `useGameState` hook
- **CON-004**: Must maintain existing component behavior and UI
- **CON-005**: Player ID format must remain `player-${uuid}` for backward compatibility

**Guidelines:**
- **GUD-001**: Follow the naming convention: `use` prefix for all custom hooks
- **GUD-002**: Place all hooks in `src/hooks/` directory
- **GUD-003**: Use named exports for utility functions
- **GUD-004**: Include JSDoc comments for all public APIs
- **GUD-005**: Keep hooks focused on single responsibility
- **GUD-006**: Return stable references using `useMemo` and `useCallback` where appropriate

**Patterns:**
- **PAT-001**: Use the custom hooks pattern as demonstrated in `useGameState.ts`
- **PAT-002**: Return objects with named properties instead of arrays for clarity
- **PAT-003**: Handle cleanup in `useEffect` return functions
- **PAT-004**: Provide both data and action methods from hooks

## 2. Implementation Steps

### Implementation Phase 1: Create Player ID Hook

- GOAL-001: Extract player ID management into `usePlayerId` hook with localStorage persistence

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `src/hooks/usePlayerId.ts` with `usePlayerId()` hook that generates and persists player ID in localStorage | | |
| TASK-002 | Implement player ID generation using `crypto.randomUUID()` with format `player-${uuid}` | | |
| TASK-003 | Add TypeScript interface `PlayerIdHook` with return type `{ playerId: string }` | | |
| TASK-004 | Add JSDoc comments documenting hook usage and return values | | |
| TASK-005 | Export constant for storage key from `src/utils/constants.ts` (already exists as `PLAYER_ID_KEY`) | | |

### Implementation Phase 2: Create URL Parameter Hook

- GOAL-002: Extract URL parameter reading and writing into `useUrlParams` hook

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `src/hooks/useUrlParams.ts` with generic `useUrlParams<T>(key: string, defaultValue?: T)` hook | | |
| TASK-007 | Implement `getParam()` method to read URL parameter from `window.location.search` | | |
| TASK-008 | Implement `setParam(value: T \| null)` method to update URL parameter using `window.history.replaceState` | | |
| TASK-009 | Implement `clearParam()` method to remove parameter from URL | | |
| TASK-010 | Add TypeScript interface `UrlParamsHook<T>` with return type `{ value: T \| null, setParam: (value: T \| null) => void, clearParam: () => void }` | | |
| TASK-011 | Add synchronization effect to update state when URL changes (popstate event) | | |
| TASK-012 | Add JSDoc comments with usage examples | | |

### Implementation Phase 3: Create Session Restoration Hook

- GOAL-003: Extract session restoration logic into `useSessionRestoration` hook

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Create `src/hooks/useSessionRestoration.ts` with `useSessionRestoration(checkValidity: (code: string) => Promise<boolean>)` hook | | |
| TASK-014 | Implement initial session restoration from URL parameter on mount | | |
| TASK-015 | Add validation check using provided `checkValidity` function | | |
| TASK-016 | Implement loading state management during restoration | | |
| TASK-017 | Add TypeScript interface `SessionRestorationHook` with return type `{ isRestoring: boolean, restoredRoomCode: string \| null }` | | |
| TASK-018 | Handle invalid room codes by clearing URL parameters | | |
| TASK-019 | Add JSDoc comments documenting the restoration flow | | |

### Implementation Phase 4: Refactor Game Component

- GOAL-004: Replace inline session management logic in `Game.tsx` with custom hooks

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Import `usePlayerId` hook and replace player ID state initialization (lines 10-17) | | |
| TASK-021 | Import `useUrlParams` hook and replace room code URL management (lines 54-63) | | |
| TASK-022 | Import `useSessionRestoration` hook and replace session restoration logic (lines 29-51) | | |
| TASK-023 | Remove manual URL cleanup calls and use `clearParam()` method instead (lines 43, 61, 161) | | |
| TASK-024 | Update component state to use restored room code from `useSessionRestoration` | | |
| TASK-025 | Verify that `isRestoringSession` state is replaced by `isRestoring` from hook | | |
| TASK-026 | Test that all game flows work correctly (create, join, restore session) | | |

### Implementation Phase 5: Cleanup and Documentation

- GOAL-005: Clean up code, update documentation, and verify functionality

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Remove unused state variables and effects from `Game.tsx` | | |
| TASK-028 | Run `npm run lint` and fix any ESLint warnings | | |
| TASK-029 | Update `AGENTS.md` to document the new hooks in the hooks section | | |
| TASK-030 | Add example usage to hook documentation | | |
| TASK-031 | Verify type safety by running `npm run build` | | |
| TASK-032 | Test session restoration by opening game with `?room=CODE` URL parameter | | |
| TASK-033 | Test player ID persistence across browser refreshes | | |

## 3. Alternatives

**Alternative Approaches Considered:**

- **ALT-001**: **Use Context API for session management** - Decided against this because it would add unnecessary complexity for simple localStorage and URL operations. Custom hooks provide better encapsulation and testability.

- **ALT-002**: **Create a single `useSession` hook combining all functionality** - Rejected because it violates the Single Responsibility Principle. Separate hooks allow better composition and reusability.

- **ALT-003**: **Use React Router for URL management** - Not chosen because the project doesn't currently use React Router, and adding it would be overkill for simple query parameter management.

- **ALT-004**: **Store room code in localStorage instead of URL** - Rejected because URL parameters enable easy sharing of game links, which is a key feature for multiplayer games.

- **ALT-005**: **Use a state management library (Redux, Zustand)** - Unnecessary for this refactoring. The current hook-based approach is sufficient and keeps dependencies minimal.

## 4. Dependencies

**Internal Dependencies:**
- **DEP-001**: `src/hooks/useGameState.ts` - The new hooks must integrate with existing game state management
- **DEP-002**: `src/utils/constants.ts` - Uses `PLAYER_ID_KEY` constant (already exists)
- **DEP-003**: `src/components/Game.tsx` - Main component that will consume the new hooks

**External Dependencies:**
- **DEP-004**: React 19.2.0 - Hooks API (`useState`, `useEffect`, `useMemo`, `useCallback`)
- **DEP-005**: TypeScript 5.9.3 - Type definitions and interfaces
- **DEP-006**: Browser APIs - `localStorage`, `window.history`, `URLSearchParams`, `crypto.randomUUID()`

**No new external packages are required for this refactoring.**

## 5. Files

**New Files:**
- **FILE-001**: `src/hooks/usePlayerId.ts` - Custom hook for player ID management with localStorage persistence
- **FILE-002**: `src/hooks/useUrlParams.ts` - Generic custom hook for URL parameter management
- **FILE-003**: `src/hooks/useSessionRestoration.ts` - Custom hook for session restoration on mount

**Modified Files:**
- **FILE-004**: `src/components/Game.tsx` - Remove inline session management, integrate new hooks (lines 10-17, 29-63)
- **FILE-005**: `src/utils/constants.ts` - Already contains `PLAYER_ID_KEY`, may add additional URL-related constants
- **FILE-006**: `AGENTS.md` - Update documentation to describe new hooks and their usage

**No files will be deleted in this refactoring.**

## 6. Testing

**Manual Testing:**
- **TEST-001**: Create a new game and verify player ID is generated and stored in localStorage
- **TEST-002**: Refresh the page and verify the same player ID is retrieved from localStorage
- **TEST-003**: Create a game and verify room code appears in URL as `?room=CODE`
- **TEST-004**: Copy URL with room code and open in new tab, verify session is restored
- **TEST-005**: Join a game and verify URL is updated with room code
- **TEST-006**: Leave a game and verify room code is cleared from URL
- **TEST-007**: Open URL with invalid room code and verify it's cleared automatically
- **TEST-008**: Test all game flows (create, join, play, finish) to ensure nothing is broken

**Future Automated Testing Recommendations:**
- **TEST-009**: Add Vitest tests for `usePlayerId` hook (mock localStorage)
- **TEST-010**: Add Vitest tests for `useUrlParams` hook (mock window.history and location)
- **TEST-011**: Add Vitest tests for `useSessionRestoration` hook (mock async validation)
- **TEST-012**: Add React Testing Library tests for `Game` component integration

**Validation Criteria:**
- All manual tests pass without errors
- `npm run lint` passes without warnings
- `npm run build` completes successfully with no TypeScript errors
- No console errors in browser during game flows

## 7. Risks & Assumptions

**Risks:**
- **RISK-001**: **Breaking existing game sessions** - If player ID format changes, existing players may lose their session. Mitigation: Keep the same `player-${uuid}` format.
- **RISK-002**: **URL parameter conflicts** - If other features add URL parameters, there could be naming conflicts. Mitigation: Use namespaced parameter names like `game_room`.
- **RISK-003**: **Browser history pollution** - Excessive `replaceState` calls could affect browser history. Mitigation: Only update URL when room code actually changes.
- **RISK-004**: **Race conditions during restoration** - Async validation could complete after component unmounts. Mitigation: Proper cleanup and conditional state updates.

**Assumptions:**
- **ASSUMPTION-001**: localStorage is available in all target browsers (modern browsers support it)
- **ASSUMPTION-002**: `crypto.randomUUID()` is available (supported in all modern browsers and Node.js 16+)
- **ASSUMPTION-003**: Players will not manually manipulate localStorage or URL parameters maliciously
- **ASSUMPTION-004**: The `checkRoomValidity` function from `useGameState` will remain available
- **ASSUMPTION-005**: No server-side rendering (SSR) is required (this is a client-side only app)

## 8. Related Specifications / Further Reading

**Internal Documentation:**
- [AGENTS.md](../AGENTS.md) - Project setup and development guidelines
- [src/hooks/useGameState.ts](../src/hooks/useGameState.ts) - Existing custom hook pattern example
- [src/utils/constants.ts](../src/utils/constants.ts) - Shared constants

**React Documentation:**
- [React Hooks Documentation](https://react.dev/reference/react) - Official hooks API reference
- [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) - Custom hooks best practices
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) - Effect optimization guide

**Web APIs:**
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) - localStorage documentation
- [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) - window.history documentation
- [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) - URL parameter handling

**TypeScript:**
- [React TypeScript Cheatsheet - Hooks](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/hooks) - TypeScript patterns for hooks