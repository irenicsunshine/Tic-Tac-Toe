// File: TicTacToe.js
// Save Location: src/components/TicTacToe.js
// Description: Tic-Tac-Toe with named opponents and difficulty levels

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './TicTacToe.css';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(''));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameFinished, setGameFinished] = useState(false);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const [gameMode, setGameMode] = useState('human');
  const [selectedOpponent, setSelectedOpponent] = useState('alex');
  const [isThinking, setIsThinking] = useState(false);
  const [winnerCells, setWinnerCells] = useState([]);
  const [audioContext, setAudioContext] = useState(null);

  // Define opponents with personalities and difficulty levels
  const opponents = {
    alex: {
      name: 'Alex',
      difficulty: 'easy',
      description: 'Friendly and makes occasional mistakes',
      thinkingTime: [800, 1500],
      errorRate: 0.3
    },
    maya: {
      name: 'Maya',
      difficulty: 'medium', 
      description: 'Balanced player with good strategy',
      thinkingTime: [1000, 2000],
      errorRate: 0.15
    },
    victor: {
      name: 'Victor',
      difficulty: 'expert',
      description: 'Master strategist, nearly unbeatable',
      thinkingTime: [1500, 3000],
      errorRate: 0.05
    }
  };

  const winCombos = useMemo(() => [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ], []);

  // Audio system
  useEffect(() => {
    const initAudio = async () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
      } catch (error) {
        console.warn('Audio context not supported');
      }
    };
    initAudio();
  }, []);

  const playTone = useCallback((frequency, duration) => {
    if (isMuted || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }, [isMuted, audioContext]);

  const sounds = {
    move: () => playTone(800, 0.1),
    win: () => playTone(1000, 0.3),
    click: () => playTone(600, 0.05)
  };

  // Game logic
  const checkWinner = useCallback((boardState, player) => {
    for (let combo of winCombos) {
      const [a, b, c] = combo;
      if (boardState[a] === player && boardState[b] === player && boardState[c] === player) {
        return combo;
      }
    }
    return null;
  }, [winCombos]);

  const getEmptyCells = useCallback((boardState) => {
    return boardState.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
  }, []);

  // Advanced minimax for expert level
  const minimax = useCallback((boardState, depth, isMaximizing, alpha = -Infinity, beta = Infinity) => {
    const winner = checkWinner(boardState, 'O') ? 'O' : checkWinner(boardState, 'X') ? 'X' : null;
    
    if (winner === 'O') return 10 - depth;
    if (winner === 'X') return depth - 10;
    if (getEmptyCells(boardState).length === 0) return 0;
    if (depth > 6) return 0;

    const emptyCells = getEmptyCells(boardState);
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let cellIndex of emptyCells) {
        const newBoard = [...boardState];
        newBoard[cellIndex] = 'O';
        const evaluation = minimax(newBoard, depth + 1, false, alpha, beta);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let cellIndex of emptyCells) {
        const newBoard = [...boardState];
        newBoard[cellIndex] = 'X';
        const evaluation = minimax(newBoard, depth + 1, true, alpha, beta);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [checkWinner, getEmptyCells]);

  // Simple strategy for easy/medium levels
  const getStrategicMove = useCallback((boardState) => {
    const emptyCells = getEmptyCells(boardState);
    
    // Check for winning moves
    for (let cellIndex of emptyCells) {
      const newBoard = [...boardState];
      newBoard[cellIndex] = 'O';
      if (checkWinner(newBoard, 'O')) return cellIndex;
    }
    
    // Check for blocking moves
    for (let cellIndex of emptyCells) {
      const newBoard = [...boardState];
      newBoard[cellIndex] = 'X';
      if (checkWinner(newBoard, 'X')) return cellIndex;
    }
    
    // Prefer center
    if (boardState[4] === '') return 4;
    
    // Prefer corners
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => boardState[i] === '');
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }
    
    // Random move
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }, [getEmptyCells, checkWinner]);

  const getBestMove = useCallback((boardState) => {
    const opponent = opponents[selectedOpponent];
    const emptyCells = getEmptyCells(boardState);
    
    if (emptyCells.length === 0) return null;

    // Introduce errors based on difficulty
    if (Math.random() < opponent.errorRate) {
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    switch (opponent.difficulty) {
      case 'easy':
        // Mix of random and strategic moves
        return Math.random() < 0.6 ? getStrategicMove(boardState) : 
               emptyCells[Math.floor(Math.random() * emptyCells.length)];
      
      case 'medium':
        return getStrategicMove(boardState);
      
      case 'expert':
        // Use full minimax
        let bestMove = -1;
        let bestValue = -Infinity;

        for (let cellIndex of emptyCells) {
          const newBoard = [...boardState];
          newBoard[cellIndex] = 'O';
          const moveValue = minimax(newBoard, 0, false);
          
          if (moveValue > bestValue) {
            bestValue = moveValue;
            bestMove = cellIndex;
          }
        }

        return bestMove !== -1 ? bestMove : emptyCells[0];
      
      default:
        return emptyCells[0];
    }
  }, [selectedOpponent, getEmptyCells, getStrategicMove, minimax]);

  const handleWin = useCallback((player, winCombo) => {
    sounds.win();
    setWinnerCells(winCombo);
    setGameFinished(true);
    setScores(prev => ({ ...prev, [player]: prev[player] + 1 }));
  }, [sounds]);

  const makeMove = useCallback((cellIndex, player, isOpponent = false) => {
    if (gameFinished || board[cellIndex] !== '' || isThinking) return;

    const newBoard = [...board];
    newBoard[cellIndex] = player;
    setBoard(newBoard);

    sounds.move();

    const winCombo = checkWinner(newBoard, player);
    if (winCombo) {
      handleWin(player, winCombo);
    } else if (getEmptyCells(newBoard).length === 0) {
      setGameFinished(true);
    } else {
      setCurrentPlayer(player === 'X' ? 'O' : 'X');
    }
  }, [board, gameFinished, isThinking, sounds, checkWinner, handleWin, getEmptyCells]);

  const opponentMove = useCallback(() => {
    if (gameFinished || isThinking) return;
    
    setIsThinking(true);
    const opponent = opponents[selectedOpponent];
    const [minTime, maxTime] = opponent.thinkingTime;
    const thinkingDuration = minTime + Math.random() * (maxTime - minTime);
    
    setTimeout(() => {
      const bestMoveIndex = getBestMove(board);
      if (bestMoveIndex !== null) {
        makeMove(bestMoveIndex, 'O', true);
      }
      setIsThinking(false);
    }, thinkingDuration);
  }, [gameFinished, isThinking, selectedOpponent, getBestMove, board, makeMove]);

  useEffect(() => {
    if (gameMode === 'computer' && currentPlayer === 'O' && !gameFinished && !isThinking) {
      const timer = setTimeout(opponentMove, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, gameFinished, isThinking, opponentMove]);

  const handleCellClick = (cellIndex) => {
    if (gameMode === 'computer' && currentPlayer === 'O') return;
    makeMove(cellIndex, currentPlayer);
  };

  const initGame = () => {
    setBoard(Array(9).fill(''));
    setCurrentPlayer('X');
    setGameFinished(false);
    setIsThinking(false);
    setWinnerCells([]);
    sounds.click();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) sounds.click();
  };

  const resetScore = () => {
    setScores({ X: 0, O: 0 });
    sounds.click();
  };

  const switchMode = (mode) => {
    setGameMode(mode);
    initGame();
  };

  const selectOpponent = (opponentId) => {
    setSelectedOpponent(opponentId);
    if (gameMode === 'computer') {
      initGame();
    }
    sounds.click();
  };

  const getStatusMessage = () => {
    const opponent = opponents[selectedOpponent];
    
    if (gameFinished) {
      if (winnerCells.length > 0) {
        const winner = board[winnerCells[0]];
        return `${winner === 'X' ? 'You' : opponent.name} win${winner === 'X' ? '' : 's'}!`;
      }
      return "It's a draw!";
    }
    if (isThinking) {
      return `${opponent.name} is thinking`;
    }
    if (gameMode === 'computer') {
      return currentPlayer === 'X' ? 'Your turn' : `${opponent.name}'s turn`;
    }
    return `Player ${currentPlayer}'s turn`;
  };

  const getCellClass = (index) => {
    let className = 'cell';
    if (board[index] !== '') className += ' played';
    if (winnerCells.includes(index)) className += ' winner';
    if (board[index] === 'O' && gameMode === 'computer') className += ' opponent-move';
    return className;
  };

  return (
    <div className="tic-tac-toe-container">
      <div className="game-wrapper">
        <h1 className="game-title">Tic Tac Toe</h1>
        
        <div className="game-mode">
          <button
            className={`mode-btn ${gameMode === 'human' ? 'active' : ''}`}
            onClick={() => switchMode('human')}
          >
            Human vs Human
          </button>
          <button
            className={`mode-btn ${gameMode === 'computer' ? 'active' : ''}`}
            onClick={() => switchMode('computer')}
          >
            Play vs Computer
          </button>
        </div>

        {gameMode === 'computer' && (
          <div className="opponent-selection">
            <h3>Choose Your Opponent</h3>
            <div className="opponents-grid">
              {Object.entries(opponents).map(([id, opponent]) => (
                <div
                  key={id}
                  className={`opponent-card ${selectedOpponent === id ? 'selected' : ''}`}
                  onClick={() => selectOpponent(id)}
                >
                  <div className="opponent-name">{opponent.name}</div>
                  <div className={`opponent-difficulty difficulty-${opponent.difficulty}`}>
                    {opponent.difficulty.charAt(0).toUpperCase() + opponent.difficulty.slice(1)}
                  </div>
                  <div className="opponent-description">{opponent.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="scoreboard">
          <div className="score-item">
            <div className="score-label">You</div>
            <div className="score-value">{scores.X}</div>
          </div>
          <div className="current-opponent">
            {gameMode === 'computer' ? opponents[selectedOpponent].name : 'Human Mode'}
          </div>
          <div className="score-item">
            <div className="score-label">
              {gameMode === 'computer' ? opponents[selectedOpponent].name : 'Player O'}
            </div>
            <div className="score-value">{scores.O}</div>
          </div>
        </div>

        <div className={`status ${isThinking ? 'thinking' : ''}`}>
          {getStatusMessage()}
        </div>

        <div className={`board ${isThinking ? 'thinking' : ''}`}>
          {board.map((cell, index) => (
            <button
              key={index}
              className={getCellClass(index)}
              onClick={() => handleCellClick(index)}
              disabled={gameFinished || (gameMode === 'computer' && currentPlayer === 'O') || isThinking}
            >
              {cell}
            </button>
          ))}
        </div>

        <div className="controls">
          <button className="control-btn restart" onClick={initGame}>
            New Game
          </button>
          <button className="control-btn mute" onClick={toggleMute}>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button className="control-btn reset-score" onClick={resetScore}>
            Reset Score
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;
