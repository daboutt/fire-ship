interface WinnerAnnouncementProps {
  isYouWon: boolean;
  onReturnToLobby: () => void;
}
export default function WinnerAnnouncement({ isYouWon, onReturnToLobby }: WinnerAnnouncementProps) {
  return (
    <div className="app">
      <div className="waiting-room">
        <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isYouWon ? 'Victory!' : 'Defeat'}</h2>
        <div
          style={{
            fontSize: '1.5rem',
            marginBottom: '2rem',
            color: isYouWon ? '#4CAF50' : '#ff6b6b',
          }}
        >
          {isYouWon ? (
            <p>
              <strong>You Win!</strong>
              <br />
              You destroyed all enemy ships!
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
        <button onClick={onReturnToLobby} style={{ marginTop: '2rem', fontSize: '1.1rem' }}>
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
