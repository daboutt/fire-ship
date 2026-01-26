import './App.css';
import { useState } from 'react';
import Board from './components/Board';
import Game from './components/Game';

type GameMode = 'menu' | 'multi';

function App() {
  const params = new URLSearchParams(window.location.search);
  const urlRoomCode = params.get('room');

  const [mode, setMode] = useState<GameMode>(urlRoomCode ? 'multi' : 'menu');

  return (
    <>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}></div>
      <Game />
    </>
  );
}

export default App;
