import "./WaitingRoom.css";
import { motion } from "motion/react";

interface WaitingRoomProps {
  roomCode: string;
  onReturnToLobby: () => void;
}

export default function WaitingRoom({ roomCode, onReturnToLobby }: WaitingRoomProps) {
  return (
    <div className="waiting-room">
      <h2>ROOM CODE</h2>
      <div className="waiting-room-code">{roomCode}</div>

      <p className="lobby-waiting-indicator">
        <span>Waiting for players</span>

        <div className="waiting-dots">
          <motion.div
            className="dot"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="dot"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div
            className="dot"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.6 }}
          />
        </div>
      </p>
      <button onClick={onReturnToLobby} className="return-lobby">
        ← Back to Lobby
      </button>
    </div>
  );
}
