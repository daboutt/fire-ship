interface HomeProps {
  onCreateGame: () => void;
  inputCode: string;
  onInputCodeChange: (value: string) => void;
  onJoinGame: () => void;
}

export default function Home({ onCreateGame, inputCode, onInputCodeChange, onJoinGame }: HomeProps) {
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
            onChange={(e) => onInputCodeChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onJoinGame()}
            maxLength={6}
          />
          <button onClick={onJoinGame}>Join Game</button>
        </div>
      </div>
    </div>
  );
}
