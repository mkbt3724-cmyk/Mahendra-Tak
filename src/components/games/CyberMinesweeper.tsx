/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, RotateCcw, HelpCircle, Trophy, Volume2, VolumeX } from 'lucide-react';
import { submitScore, unlockAchievement } from '../../lib/dbHelper';
import { UserProfile } from '../../types';

interface CyberMinesweeperProps {
  user: UserProfile | null;
  onScoreSubmitted: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  graphicsQuality?: 'sd' | '1080p' | '4k';
}

interface Cell {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export default function CyberMinesweeper({
  user,
  onScoreSubmitted,
  onShowNotification,
  graphicsQuality = '1080p',
}: CyberMinesweeperProps) {
  const [gridSize, setGridSize] = useState(8);
  const [mineCount, setMineCount] = useState(10);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'idle'>('idle');
  const [time, setTime] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Timer Effect
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const playSound = (type: 'reveal' | 'flag' | 'explode' | 'victory') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'reveal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'flag') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(450, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'explode') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'victory') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Ignored
    }
  };

  const createBoard = () => {
    // Generate empty grid
    const initialGrid: Cell[][] = [];
    for (let x = 0; x < gridSize; x++) {
      const row: Cell[] = [];
      for (let y = 0; y < gridSize; y++) {
        row.push({
          x,
          y,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
        });
      }
      initialGrid.push(row);
    }

    // Place mines randomly
    let placedMines = 0;
    while (placedMines < mineCount) {
      const randX = Math.floor(Math.random() * gridSize);
      const randY = Math.floor(Math.random() * gridSize);
      if (!initialGrid[randX][randY].isMine) {
        initialGrid[randX][randY].isMine = true;
        placedMines++;
      }
    }

    // Calculate neighboring mine numbers
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        if (initialGrid[x][y].isMine) continue;

        let count = 0;
        // Check 8 directions
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
              if (initialGrid[nx][ny].isMine) count++;
            }
          }
        }
        initialGrid[x][y].neighborMines = count;
      }
    }

    setGrid(initialGrid);
    setTime(0);
    setGameState('playing');
  };

  const revealCell = (x: number, y: number) => {
    if (gameState !== 'playing' || grid[x][y].isRevealed || grid[x][y].isFlagged) return;

    playSound('reveal');
    const newGrid = [...grid.map(row => [...row])];

    if (newGrid[x][y].isMine) {
      // Explode! Lost!
      newGrid[x][y].isRevealed = true;
      // Reveal all mines
      newGrid.forEach((row) => {
        row.forEach((cell) => {
          if (cell.isMine) cell.isRevealed = true;
        });
      });
      setGrid(newGrid);
      setGameState('lost');
      playSound('explode');
      return;
    }

    // Auto-expand empty nodes (standard flood fill)
    const revealDFS = (cx: number, cy: number) => {
      if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize || newGrid[cx][cy].isRevealed || newGrid[cx][cy].isFlagged) return;

      newGrid[cx][cy].isRevealed = true;

      if (newGrid[cx][cy].neighborMines === 0 && !newGrid[cx][cy].isMine) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            revealDFS(cx + dx, cy + dy);
          }
        }
      }
    };

    revealDFS(x, y);

    // Check Win condition
    let revealedCount = 0;
    newGrid.forEach((row) => {
      row.forEach((cell) => {
        if (cell.isRevealed) revealedCount++;
      });
    });

    const totalNonMines = gridSize * gridSize - mineCount;
    if (revealedCount === totalNonMines) {
      setGameState('won');
      playSound('victory');
      handleWinGame(time);
    } else {
      setGrid(newGrid);
    }
  };

  const toggleFlag = (x: number, y: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (gameState !== 'playing' || grid[x][y].isRevealed) return;

    playSound('flag');
    const newGrid = [...grid.map(row => [...row])];
    newGrid[x][y].isFlagged = !newGrid[x][y].isFlagged;
    setGrid(newGrid);
  };

  const handleCellClick = (cell: Cell) => {
    if (flagMode) {
      toggleFlag(cell.x, cell.y);
    } else {
      revealCell(cell.x, cell.y);
    }
  };

  const handleWinGame = async (solveTime: number) => {
    // Score based on time (lower time = higher score)
    const calculatedScore = Math.max(100, 1000 - solveTime * 2);

    if (user) {
      try {
        await submitScore({
          gameId: 'minesweeper',
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          score: calculatedScore,
          achievementsCount: 0,
        });

        // Trigger First play & win achievements
        await unlockAchievement(user.uid, 'first-play');
        const unlocked = await unlockAchievement(user.uid, 'win-minesweeper');
        if (unlocked) {
          onShowNotification('Achievement Unlocked!', 'Firewall Activated: Swept Data Crack!', 'success');
        }

        onScoreSubmitted();
      } catch (err) {
        console.error('Error submitting scoreboard score:', err);
      }
    }
  };

  // Remaining Flags Counter
  const flaggedCount = grid.flat().filter(c => c.isFlagged).length;
  const remainingMines = Math.max(0, mineCount - flaggedCount);

  return (
    <div className="w-full flex flex-col items-center bg-zinc-950 p-6 border border-zinc-800 rounded-2xl shadow-2xl relative">
      {/* Title / Controls Header */}
      <div className="w-full flex flex-wrap justify-between items-center mb-4 text-zinc-400 text-xs font-mono gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="text-emerald-500 w-4 h-4 animate-pulse" />
          <span>PUZZLE: DATA CRACK v2.1.0</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="hover:text-emerald-400 p-1 rounded transition-colors"
            title="Toggle SFX"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <span>TIME: {time}s</span>
          <span>CORRUPTIONS: {remainingMines}</span>
        </div>
      </div>

      {/* Board */}
      {gameState === 'idle' ? (
        <div className="w-full flex flex-col items-center justify-center py-12 text-center">
          <HelpCircle className="text-emerald-500 w-12 h-12 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-2">SERVER SECURITY SWEEP</h3>
          <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
            Scan the digital sectors. Unreveal clean blocks and flag the active malware threats securely.
          </p>
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => { setGridSize(8); setMineCount(10); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${gridSize === 8 ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
            >
              8x8 (10 Core)
            </button>
            <button
              onClick={() => { setGridSize(10); setMineCount(16); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${gridSize === 10 ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
            >
              10x10 (16 Core)
            </button>
          </div>
          <button
            onClick={createBoard}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            Start Scan
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          {/* Main game board grid */}
          <div
            className="grid gap-1 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800 max-w-full overflow-auto"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(32px, 45px))`,
            }}
          >
            {grid.map((row, x) =>
              row.map((cell, y) => {
                let cellStyle = 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700/50';
                let displayVal: React.ReactNode = '';

                if (cell.isRevealed) {
                  if (cell.isMine) {
                    cellStyle = 'bg-red-950/40 border-red-500 text-red-400';
                    displayVal = <ShieldAlert className="w-5 h-5 animate-flash" />;
                  } else {
                    cellStyle = 'bg-zinc-900 text-emerald-400 border-zinc-800';
                    if (cell.neighborMines > 0) {
                      displayVal = cell.neighborMines;
                      const colorMap = [
                        'text-blue-400',
                        'text-emerald-400',
                        'text-pink-400',
                        'text-yellow-400',
                        'text-purple-400',
                        'text-red-400',
                        'text-cyan-400',
                        'text-white',
                      ];
                      cellStyle += ` ${colorMap[cell.neighborMines - 1] || 'text-zinc-400'}`;
                    }
                  }
                } else if (cell.isFlagged) {
                  cellStyle = 'bg-emerald-950/40 border-emerald-500 text-emerald-400 animate-pulse';
                  displayVal = '🚩';
                }

                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => handleCellClick(cell)}
                    onContextMenu={(e) => toggleFlag(cell.x, cell.y, e)}
                    className={`aspect-square rounded-lg flex items-center justify-center font-bold text-sm md:text-base select-none transition ${cellStyle}`}
                  >
                    {displayVal}
                  </button>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="w-full max-w-sm flex justify-between items-center mt-5 gap-4">
            {/* Flag Mode Toggle (Mobile Friendly) */}
            <button
              onClick={() => setFlagMode(!flagMode)}
              className={`flex-1 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wide transition ${flagMode ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'}`}
            >
              MODE: {flagMode ? '🚩 FLAGGING' : '⚡ REVEALING'}
            </button>
            <button
              onClick={createBoard}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-mono flex items-center gap-1.5 transition"
            >
              <RotateCcw size={14} /> Clear Scan
            </button>
          </div>
        </div>
      )}

      {/* Outcome Overlays */}
      {gameState === 'won' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-fade-in">
          <Trophy className="text-emerald-500 w-16 h-16 mb-4 animate-bounce" />
          <h3 className="text-3xl font-extrabold text-white mb-2">SYSTEM SECURED</h3>
          <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed font-mono">
            All infected nodes successfully patched in <span className="text-emerald-400 font-bold">{time} seconds</span>. Malware footprint eradicated!
          </p>
          <div className="flex gap-4">
            <button
              onClick={createBoard}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-600/30"
            >
              Reset Sector
            </button>
            <button
              onClick={() => setGameState('idle')}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition border border-zinc-700"
            >
              Difficulty
            </button>
          </div>
        </div>
      )}

      {gameState === 'lost' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-fade-in">
          <ShieldAlert className="text-red-500 w-16 h-16 mb-4 animate-pulse" />
          <h3 className="text-3xl font-extrabold text-white mb-2">FIREWALL BREACHED</h3>
          <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed font-mono">
            Malware corruption overloaded core sectors. Server reboot advised.
          </p>
          <button
            onClick={createBoard}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition border border-zinc-700 shadow-lg shadow-black/40"
          >
            Reboot Sweep
          </button>
        </div>
      )}
    </div>
  );
}
