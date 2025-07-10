// File: TicTacToe.js
// Save Location: src/components/TicTacToe.js
// Description: Main React component for Tic-Tac-Toe game with AI opponent

import React, { useState, useEffect, useCallback } from 'react';
import './TicTacToe.css';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(''));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameFinished, setGameFinished] = useState(false);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const [gameMode, setGameMode] = useState('human');
  const [aiThinking, setAiThinking] = useState(false);
  const [winnerCells, setWinnerCells] = useState([]);
  const [audioContext, setAudioContext] = useState(null);

  const winCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // Initialize audio context
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(ctx);
  }, []);

  // Sound effects
  const playTone = useCallback((frequency, duration, type = 'sine') => {
    if (isMuted || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }, [isMuted, audioContext]);

  const sounds = {
    move: () => playTone(800, 0.1, 'square'),
    aiMove: () => playTone(600, 0.15, 'triangle'),
    win: () => {
      playTone(523, 0.2);
      setTimeout(() => playTone(659, 0.2), 200);
      setTimeout(() => playTone(784, 0.4), 400);
    },
    draw: () => {
      playTone(400, 0.3, 'sawtooth');
      setTimeout(() => playTone(300, 0.3, 'sawtooth'), 150);
    },
    click: () => playTone(1000, 0.05, 'square')
  };

  // Game logic functions
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

  const simulateMove = useCallback((boardState, cellIndex, player) => {
    const newBoard = [...boardState];
    newBoard[cellIndex] = player;
    return checkWinner(newBoard, player);
  }, [checkWinner]);

  const getBestMove = useCallback((boardState) => {
    const emptyCells = getEmptyCells(boardState);
    if (emptyCells.length === 0) return null;

    // 1. Check if AI can win
    for (let cellIndex of emptyCells) {
      if (simulateMove(boardState, cellIndex, 'O')) {
        return cellIndex;
      }
    }

    // 2. Check if AI needs to block player
    for (let cellIndex of emptyCells) {
      if (simulateMove(boardState, cellIndex, 'X')) {
        return cellIndex;
      }
    }

    // 3. Strategic positions (center, corners, edges)
    if (boardState[4] === '') return 4;

    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(index => boardState[index] === '');
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    // 4. Random empty cell
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }, [getEmptyCells, simulateMove]);

  const handleWin = useCallback((player, winCombo) => {
    sounds.win();
    setWinnerCells(winCombo);
    setGameFinished(true);
    setScores(prev => ({ ...prev, [player]: prev[player] + 1 }));
  }, [sounds]);

  const handleDraw = useCallback(() => {
    sounds.draw();
    setGameFinished(true);
  }, [sounds]);

  const makeMove = useCallback((cellIndex, player, isAI = false) => {
    if (gameFinished || board[cellIndex] !== '' || aiThinking) return;

    const newBoard = [...board];
    newBoard[cellIndex] = player;
    setBoard(newBoard);

    if (isAI) {
      sounds.aiMove();
    } else {
      sounds.move();
    }

    const winCombo = checkWinner(newBoard, player);
    if (winCombo) {
      handleWin(player, winCombo);
      return;
    }

    if (getEmptyCells(newBoard).length === 0) {
      handleDraw();
      return;
    }

    setCurrentPlayer(player === 'X' ? 'O' : 'X');
  }, [board, gameFinished, aiThinking, sounds, checkWinner, handleWin, handleDraw, getEmptyCells]);

  const aiMove = useCallback(() => {
    if (gameFinished || aiThinking) return;

    setAiThinking(true);
    
    setTimeout(() => {
      const bestMoveIndex = getBestMove(board);
      if (bestMoveIndex !== null) {
        makeMove(bestMoveIndex, 'O', true);
      }
      setAiThinking(false);
    }, 800 + Math.random() * 1200);
  }, [gameFinished, aiThinking, getBestMove, board, makeMove]);

  // Handle AI move when it's AI's turn
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 'O' && !gameFinished && !aiThinking) {
      setTimeout(aiMove, 300);
    }
  }, [currentPlayer, gameMode, gameFinished, aiThinking, aiMove]);

  const handleCellClick = (cellIndex) => {
    if (gameMode === 'ai' && currentPlayer === 'O') return;
    makeMove(cellIndex, currentPlayer);
  };

  const initGame = () => {
    setBoard(Array(9).fill(''));
    setCurrentPlayer('X');
    setGameFinished(false);
    setAiThinking(false);
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

  const getStatusMessage = () => {
    if (gameFinished) {
      if (winnerCells.length > 0) {
        return `${currentPlayer === 'X' ? 'O' : 'X'} Wins! 🎉`;
      }
      return "It's a draw! 🤝";
    }
    if (aiThinking) {
      return '🤖 AI is thinking...';
    }
    return `${currentPlayer}'s turn`;
  };

  return (
    <div className="tic-tac-toe-container">
      <div className="game-wrapper">
      <h1>Tic-Tac-Toe ◯ ✕</h1>

    <div className="game-mode">
      <button 
        className={`mode-btn ${gameMode === 'human' ? 'active' : ''}`}
        onClick={() => switchMode('human')}
      >
        ◯ ✕ Human vs Human
      </button>
      <button 
        className={`mode-btn ${gameMode === 'ai' ? 'active' : ''}`}
        onClick={() => switchMode('ai')}
      >
        ◯ ✕ Human vs AI
      </button>
    </div>
        
        <div className="scoreboard">
          <div className="score-display">
            <span>X: {scores.X}</span>
            <span className="current-mode">
              {gameMode === 'ai' ? 'Human vs AI' : 'Human vs Human'}
            </span>
            <span>O: {scores.O}</span>
          </div>
        </div>
        
        <div className="status">{getStatusMessage()}</div>
        
        <div className={`board ${aiThinking ? 'thinking' : ''}`}>
          {board.map((cell, index) => (
            <div
              key={index}
              className={`cell ${cell ? 'played' : ''} ${
                winnerCells.includes(index) ? 'winner' : ''
              } ${cell === 'O' && gameMode === 'ai' ? 'ai-move' : ''}`}
              onClick={() => handleCellClick(index)}
            >
              {cell}
            </div>
          ))}
        </div>
        
        <div className="controls">
          <button className="control-btn restart" onClick={initGame}>
            ↻ Restart Game
          </button>
          <button className="control-btn mute" onClick={toggleMute}>
            {isMuted ? '🔇 Unmute' : '♪ Mute'}
          </button>
          <button className="control-btn reset-score" onClick={resetScore}>
            ⟲ Reset Score
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;
