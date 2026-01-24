import './WaitingRoom.css';
import { motion } from 'motion/react';

export default function WaitingRoom() {
  return (
    <div className='waiting-room'>
      <h2>ROOM CODE</h2>
      <p className='lobby-waiting-indicator'>
        <span>Waiting for players</span>

        <div className='waiting-dots'>
          <motion.div
            className='dot'
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className='dot'
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div
            className='dot'
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.6 }}
          />
        </div>
      </p>

      {/* Room code goes here */}
      <div className='lobby-divider'>Share it with your friends</div>
    </div>
  );
}
