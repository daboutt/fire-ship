import './App.css';
import WaitingRoom from './components/WaitingRoom';

function App() {
  return <WaitingRoom />;
  return (
    <div className='app'>
      <h2>Fire Ship Battle</h2>
      <div className='lobby'>
        <p className='lobby-hint'>Start a new game and share the code</p>
        <div className='lobby-section'>
          <button>New Game</button>
        </div>
        <div className='lobby-divider'>
          <span>OR</span>
        </div>
        <p className='lobby-hint'>Enter the code shared by your friend</p>

        <div className='lobby-section'>
          <input className='lobby-input-code' type='text' placeholder='code' />
          <button>Join Game</button>
        </div>
      </div>
    </div>
  );
}

export default App;
