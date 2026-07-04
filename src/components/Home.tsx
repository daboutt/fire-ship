import { useCallback, useState } from "react";

interface HomeProps {
  onCreateGame: () => void;
  onJoinGame: (code: string) => Promise<boolean>;
  joinError: string | null;
}

export default function Home({ onCreateGame, onJoinGame, joinError }: HomeProps) {
  const [inputCode, setInputCode] = useState("");

  const handleJoinGame = useCallback(async () => {
    const normalized = inputCode.trim().toUpperCase();
    if (!normalized) return;
    await onJoinGame(normalized);
  }, [inputCode, onJoinGame]);

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
            onChange={(e) => setInputCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
            maxLength={6}
          />
          <button onClick={handleJoinGame}>Join Game</button>
          {joinError && <p className="lobby-error">{joinError}</p>}
        </div>
      </div>
    </div>
  );
}
