# AGENTS.md

## Project Overview

This is a **Fire Ship** - a multiplayer Battleship game built with React, TypeScript, Vite, and Firebase Realtime Database. Players can create game rooms, place ships, and battle against each other in real-time.

**Key Technologies:**
- **Frontend:** React 19 with TypeScript
- **Build Tool:** Vite (with HMR and Fast Refresh)
- **State Management:** Custom React hooks for game state
- **Backend:** Firebase Realtime Database for multiplayer synchronization
- **Animations:** Motion library for UI animations
- **Styling:** CSS modules

**Architecture:**
- Single-page application with component-based architecture
- Real-time multiplayer using Firebase Database listeners
- Custom hooks pattern for game state management (`useGameState`)
- Utility functions for ship placement and game logic

## Setup Commands

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Firebase project with Realtime Database enabled

### Installation
```bash
npm install
```

### Environment Configuration
Create a `.env` file at the root with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Important:** All Firebase environment variables are required. The app will throw an error if any are missing (see [src/firebase.ts](src/firebase.ts)).

## Development Workflow

### Start Development Server
```bash
npm run dev
```
- Runs on `http://localhost:5173` by default
- Includes Hot Module Replacement (HMR) for instant updates
- Uses React Fast Refresh for state preservation during development

### Build for Production
```bash
npm run build
```
- Compiles TypeScript (`tsc -b`)
- Bundles with Vite
- Output goes to `dist/` directory

### Preview Production Build
```bash
npm run preview
```
- Serves the production build locally for testing

## Project Structure

```
src/
├── components/          # React components
│   ├── Board.tsx       # Game board display
│   ├── Game.tsx        # Main game logic and room management
│   ├── WaitingRoom.tsx # Pre-game lobby
│   └── *.css           # Component-specific styles
├── hooks/              # Custom React hooks
│   ├── useGameState.ts # Firebase game state management
│   ├── usePlayerId.ts  # Player ID generation and localStorage persistence
│   ├── useUrlParams.ts # Generic URL parameter management
│   └── useSessionRestoration.ts # Session restoration from URL parameters
├── utils/              # Utility functions
│   ├── shipPlacement.ts # Ship positioning logic
│   ├── constants.ts    # Global constants
│   └── user.ts         # User-related utilities
├── firebase.ts         # Firebase configuration and initialization
└── main.tsx           # Application entry point
```

## Code Style Guidelines

### TypeScript Conventions
- Use TypeScript strict mode
- Define explicit types for all props and state
- Use interfaces for object shapes
- Prefer `const` over `let`, avoid `var`

### React Patterns
- Functional components with hooks (no class components)
- Custom hooks for reusable logic (prefix with `use`)
- Use `useMemo` and `useCallback` for performance optimization where appropriate
- Keep components focused on single responsibility

### File Organization
- Co-locate CSS files with components: `Component.tsx` + `Component.css`
- Place shared utilities in `src/utils/`
- Place custom hooks in `src/hooks/`
- Use named exports for utilities, default exports for components

### Naming Conventions
- **Components:** PascalCase (`Board.tsx`, `WaitingRoom.tsx`)
- **Hooks:** camelCase with `use` prefix (`useGameState.ts`)
- **Utils:** camelCase (`shipPlacement.ts`, `user.ts`)
- **Constants:** UPPER_SNAKE_CASE in `constants.ts`
- **CSS classes:** kebab-case

### Import Order
1. React and external dependencies
2. Internal components
3. Hooks
4. Utilities and constants
5. CSS files (last)

Example:
```typescript
import { useState, useEffect } from 'react';
import Board from './Board';
import { useGameState } from '../hooks/useGameState';
import { PLAYER_ID_KEY } from '../utils/constants';
import './Game.css';
```

## Linting

### Run ESLint
```bash
npm run lint
```

- Configuration: [eslint.config.js](eslint.config.js)
- Uses TypeScript ESLint parser
- Includes React hooks and React refresh plugins
- Fix issues before committing

## Firebase Integration

### Database Structure
The game uses Firebase Realtime Database with the following structure:
- Game rooms are identified by room codes
- Player IDs are stored in localStorage with key from `PLAYER_ID_KEY`
- Real-time listeners sync game state between players

### Key Files
- [src/firebase.ts](src/firebase.ts) - Firebase initialization and configuration
- [src/hooks/useGameState.ts](src/hooks/useGameState.ts) - Firebase game state management
- [src/utils/constants.ts](src/utils/constants.ts) - Shared constants including `PLAYER_ID_KEY`

### Security Notes
- Never commit `.env` file with real credentials
- Firebase environment variables are validated at runtime
- Use Firebase Security Rules to protect database access

## Build and Deployment

### Production Build
```bash
npm run build
```

**Build Process:**
1. TypeScript compilation with `tsc -b`
2. Vite bundling and optimization
3. Output to `dist/` directory

**Output:**
- Optimized JavaScript bundles
- Minified CSS
- Static assets from `public/`
- Generated `index.html`

### Deployment Considerations
- Deploy `dist/` directory to static hosting (Vercel, Netlify, Firebase Hosting, etc.)
- Set environment variables in hosting platform
- Configure Firebase Security Rules before production deployment
- Consider CDN for static assets

## Common Development Tasks

### Adding a New Component
1. Create `ComponentName.tsx` in `src/components/`
2. Create corresponding `ComponentName.css` if needed
3. Export as default from the component file
4. Import and use in parent components

### Adding Utility Functions
1. Add to existing file in `src/utils/` or create new file
2. Use named exports
3. Keep functions pure when possible
4. Add to `constants.ts` for shared constants

### Creating Custom Hooks
1. Create file in `src/hooks/` with `use` prefix
2. Follow React hooks rules (don't call conditionally)
3. Export as named export
4. Document complex hook logic with comments
5. Use TypeScript interfaces for return types
6. Include JSDoc comments with usage examples

**Available Custom Hooks:**
- `useGameState` - Firebase game state management with real-time synchronization
- `usePlayerId` - Player ID generation and localStorage persistence
- `useUrlParams<T>` - Generic URL parameter reading and writing
- `useSessionRestoration` - Automatic session restoration from URL parameters

### Working with Firebase
- Game state changes are synced automatically via listeners
- Use the `useGameState` hook for all game state operations
- Session restoration is handled via URL parameters (`?room=CODE`)

## Troubleshooting

### Firebase Configuration Issues
- **Error:** "Missing Firebase configuration"
  - **Solution:** Ensure all `VITE_FIREBASE_*` environment variables are set in `.env`
  
- **Error:** Connection refused or permission denied
  - **Solution:** Check Firebase Security Rules and ensure database URL is correct

### Build Errors
- **TypeScript errors:** Run `npm run build` to see all type errors
- **Import errors:** Check file paths and ensure proper file extensions
- **Missing dependencies:** Run `npm install` to ensure all packages are installed

### Development Server Issues
- **Port already in use:** Kill the process on port 5173 or change port in [vite.config.ts](vite.config.ts)
- **HMR not working:** Restart the dev server with `npm run dev`

## Pull Request Guidelines

### Before Submitting
1. Run `npm run lint` and fix all issues
2. Run `npm run build` to ensure production build works
3. Test functionality in development mode
4. Ensure no console errors or warnings

### PR Title Format
```
[component] Brief description of changes
```
Examples:
- `[Game] Add rematch functionality`
- `[Board] Fix ship placement validation`
- `[hooks] Optimize useGameState performance`

### Commit Message Convention
- Use present tense: "Add feature" not "Added feature"
- Be descriptive but concise
- Reference issue numbers when applicable

## Additional Notes

### Session Management
- Player IDs are auto-generated and stored in localStorage using `usePlayerId` hook
- Room codes are managed via URL parameters using `useUrlParams` hook  
- Session restoration is handled automatically on mount using `useSessionRestoration` hook
- Invalid rooms are automatically cleaned up during restoration

### Performance Considerations
- Use `useMemo` for expensive calculations (e.g., ship placement validation)
- Debounce Firebase writes if needed for rapid updates
- Lazy load components if bundle size grows

### Testing Strategy
Currently no automated tests are configured. When adding tests:
- Consider Vitest for unit tests (compatible with Vite)
- Use React Testing Library for component tests
- Mock Firebase operations in tests

### Common Gotchas
- Firebase listeners must be cleaned up in `useEffect` return functions
- Vite environment variables must be prefixed with `VITE_`
- TypeScript strict mode is enabled - all types must be properly defined
- Component state resets on hot reload if not using Fast Refresh correctly
