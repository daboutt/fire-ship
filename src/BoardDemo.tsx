import Board, { type CellStatus } from './components/Board';
import './App.css';

function BoardDemo() {
  // Create a demo board with some ships, hits, and misses
  const createDemoBoard = (): CellStatus[][] => {
    const board: CellStatus[][] = Array.from({ length: 10 }, () =>
      Array(10).fill('empty'),
    );

    // Add some ships (horizontal)
    for (let i = 2; i <= 5; i++) {
      board[1][i] = 'ship';
    }

    // Add another ship (vertical)
    for (let i = 5; i <= 7; i++) {
      board[i][7] = 'ship';
    }

    // Add some hits
    board[1][3] = 'hit';
    board[6][7] = 'hit';

    // Add some misses
    board[0][2] = 'miss';
    board[3][4] = 'miss';
    board[8][8] = 'miss';

    return board;
  };

  const handleCellClick = (row: number, col: number) => {
    console.log(`Clicked cell at row ${row}, column ${col}`);
  };

  return (
    <div className='app'>
      <h2>Fire Ship Battle - Board Demo</h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ textAlign: 'center' }}>
            Your Board (with ships visible)
          </h3>
          <Board
            boardData={createDemoBoard()}
            label='Your Board'
            isOpponent={false}
            disabled={true}
          />
        </div>

        <div>
          <h3 style={{ textAlign: 'center' }}>
            Opponent Board (ships hidden, clickable)
          </h3>
          <Board
            boardData={createDemoBoard()}
            label='Opponent Board'
            isOpponent={true}
            disabled={false}
            onCellClick={handleCellClick}
          />
        </div>

        <div>
          <h3 style={{ textAlign: 'center' }}>Empty Board</h3>
          <Board label='Empty Board' />
        </div>
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'rgba(28, 28, 28, 0.3)',
          borderRadius: '8px',
        }}
      >
        <h3>Legend:</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>
            <strong>Dark Green Cells</strong> - Your ships (only visible on your
            board)
          </li>
          <li>
            <strong>Red Cells with ✕</strong> - Successful hits
          </li>
          <li>
            <strong>Blue Cells with ○</strong> - Missed shots
          </li>
          <li>
            <strong>Light Green Cells</strong> - Empty water
          </li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          <em>
            Open browser console to see click events on the opponent board.
          </em>
        </p>
      </div>
    </div>
  );
}

export default BoardDemo;
