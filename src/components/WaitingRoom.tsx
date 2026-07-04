import { useState } from "react";
import "./WaitingRoom.css";

interface WaitingRoomProps {
  roomCode: string;
  onReturnToLobby: () => void;
}

export default function WaitingRoom({ roomCode, onReturnToLobby }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="waiting-room">
      <h2>ROOM CODE</h2>
      <button className="waiting-room-code" onClick={handleCopy} title="Click to copy">
        {roomCode}
        <span className="copy-hint">{copied ? " ✓ Copied!" : " 📋"}</span>
      </button>

      <p className="lobby-waiting-indicator">
        <span>Waiting for players</span>

        <div className="waiting-dots">
          <div className="dot" style={{ animationDelay: "0s" }} />
          <div className="dot" style={{ animationDelay: "0.3s" }} />
          <div className="dot" style={{ animationDelay: "0.6s" }} />
        </div>
      </p>
      <button onClick={onReturnToLobby} className="return-lobby">
        ← Back to Lobby
      </button>
    </div>
  );
}
