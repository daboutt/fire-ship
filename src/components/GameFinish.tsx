interface GameFinishProps {
  youWon: boolean;
  onReturnToLobby: () => void;
}

export default function GameFinish({ youWon, onReturnToLobby }: GameFinishProps) {
  return (
    <div className="app">
      <div className="waiting-room">
        <h2 className="finished-title">{youWon ? "🎉 Victory!" : "💔 Defeat"}</h2>
        <div className={`finished-message ${youWon ? "finished-win" : "finished-lose"}`}>
          {youWon ? (
            <p>
              <strong>You Win!</strong>
              <br />
              You destroyed all enemy ships! 🚢💥
            </p>
          ) : (
            <p>
              <strong>You Lost!</strong>
              <br />
              Your opponent destroyed all your ships!
            </p>
          )}
        </div>
        <div className="lobby-divider">Game Over</div>
        <button onClick={onReturnToLobby} className="return-lobby-btn">
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
