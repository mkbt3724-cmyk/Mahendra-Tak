/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Gamepad, Award, RotateCcw, Volume2, VolumeX, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { UserProfile } from '../../types';
import { submitScore, unlockAchievement } from '../../lib/dbHelper';

interface CyberSnakeProps {
  user: UserProfile | null;
  onScoreSubmitted: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  graphicsQuality?: 'sd' | '1080p' | '4k';
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
interface Coord {
  x: number;
  y: number;
}

export default function CyberSnake({
  user,
  onScoreSubmitted,
  onShowNotification,
  graphicsQuality = '1080p',
}: CyberSnakeProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);

  // Snake Settings
  const gridSize = 20; // 20x20 logic cells
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Snake State
  const snakeRef = useRef<Coord[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const dirRef = useRef<Direction>('UP');
  const foodRef = useRef<Coord>({ x: 5, y: 5 });
  const speedRef = useRef<number>(130); // ms per tick

  // Synth sounds
  const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context block handles
    }
  };

  // Food Placement
  const placeFood = () => {
    let placed = false;
    let rx = 0;
    let ry = 0;
    while (!placed) {
      rx = Math.floor(Math.random() * gridSize);
      ry = Math.floor(Math.random() * gridSize);
      const onSnake = snakeRef.current.some((segment) => segment.x === rx && segment.y === ry);
      if (!onSnake) {
        placed = true;
      }
    }
    foodRef.current = { x: rx, y: ry };
  };

  // Keyboard Controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isGameOver) return;
      const key = e.key;
      const currentDir = dirRef.current;

      if ((key === 'ArrowUp' || key.toLowerCase() === 'w') && currentDir !== 'DOWN') {
        dirRef.current = 'UP';
        e.preventDefault();
      } else if ((key === 'ArrowDown' || key.toLowerCase() === 's') && currentDir !== 'UP') {
        dirRef.current = 'DOWN';
        e.preventDefault();
      } else if ((key === 'ArrowLeft' || key.toLowerCase() === 'a') && currentDir !== 'RIGHT') {
        dirRef.current = 'LEFT';
        e.preventDefault();
      } else if ((key === 'ArrowRight' || key.toLowerCase() === 'd') && currentDir !== 'LEFT') {
        dirRef.current = 'RIGHT';
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver]);

  // Touch/Button Control clicker helper
  const handleSetDirection = (newDir: Direction) => {
    if (!isPlaying || isGameOver) return;
    const currentDir = dirRef.current;
    if (newDir === 'UP' && currentDir !== 'DOWN') dirRef.current = 'UP';
    if (newDir === 'DOWN' && currentDir !== 'UP') dirRef.current = 'DOWN';
    if (newDir === 'LEFT' && currentDir !== 'RIGHT') dirRef.current = 'LEFT';
    if (newDir === 'RIGHT' && currentDir !== 'LEFT') dirRef.current = 'RIGHT';
    playSound(400, 0.05);
  };

  // Start / Restart Game
  const handleStartGame = () => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    dirRef.current = 'UP';
    setScore(0);
    speedRef.current = 130;
    placeFood();
    setIsGameOver(false);
    setIsPlaying(true);
    setScoreSubmitted(false);
    playSound(400, 0.15);
    playSound(600, 0.1);
  };

  // Core Game tick loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    let timerId: NodeJS.Timeout;

    const tick = () => {
      const head = snakeRef.current[0];
      const dir = dirRef.current;

      // Next position calculation
      let nx = head.x;
      let ny = head.y;

      if (dir === 'UP') ny -= 1;
      else if (dir === 'DOWN') ny += 1;
      else if (dir === 'LEFT') nx -= 1;
      else if (dir === 'RIGHT') nx += 1;

      // Collision checks (Wall or self)
      const hitWall = nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize;
      const hitSelf = snakeRef.current.some((seg) => seg.x === nx && seg.y === ny);

      if (hitWall || hitSelf) {
        setIsGameOver(true);
        setIsPlaying(false);
        playSound(150, 0.5, 'sawtooth');
        onShowNotification('Serpent Crash! 💀', `System collision detected. Core byte length reached: ${snakeRef.current.length}`, 'info');
        return;
      }

      // Move forward
      const nextSnake = [{ x: nx, y: ny }, ...snakeRef.current];

      // Food Eaten check
      const eatFood = nx === foodRef.current.x && ny === foodRef.current.y;
      if (eatFood) {
        setScore((prev) => {
          const nextScore = prev + 10;
          // Scale speed slightly with score increments
          speedRef.current = Math.max(70, 130 - Math.floor(nextScore / 5));
          return nextScore;
        });
        playSound(800, 0.1);
        placeFood();

        // Check achievement: Byte Devourer at 30 score (3 items eaten, 10 pts each)
        if (snakeRef.current.length >= 30) {
          triggerAchievements('score-snake');
        }
      } else {
        nextSnake.pop(); // remove tail
      }

      snakeRef.current = nextSnake;
      draw();

      timerId = setTimeout(tick, speedRef.current);
    };

    timerId = setTimeout(tick, speedRef.current);
    return () => clearTimeout(timerId);
  }, [isPlaying, isGameOver]);

  // Handle high-precision HTML5 Canvas Rendering
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let multiplier = 2;
    if (graphicsQuality === 'sd') multiplier = 1;
    if (graphicsQuality === '4k') multiplier = 4;

    const logicalWidth = 360;
    const logicalHeight = 360;
    const cellSize = logicalWidth / gridSize;

    ctx.save();
    ctx.scale(multiplier, multiplier);

    // Clear Canvas with cyber styling (deep grid pattern)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Draw coordinate visual array grid lines
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, logicalHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(logicalWidth, i * cellSize);
      ctx.stroke();
    }

    // Draw neon cyber food (pink square particle)
    const fx = foodRef.current.x * cellSize + cellSize / 2;
    const fy = foodRef.current.y * cellSize + cellSize / 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ec4899';
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(fx, fy, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw neon snake body (neon teal grid cells)
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#3b82f6';
    snakeRef.current.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? '#38bdf8' : '#2563eb';
      ctx.fillRect(
        seg.x * cellSize + 2,
        seg.y * cellSize + 2,
        cellSize - 4,
        cellSize - 4
      );
    });

    // Reset shadow state and scale context
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  // Handle Canvas Resizing and scale setting
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const width = 360;
      const height = 360;

      let multiplier = 2; // 1080p default
      if (graphicsQuality === 'sd') multiplier = 1;
      if (graphicsQuality === '4k') multiplier = 4;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      canvas.width = width * multiplier;
      canvas.height = height * multiplier;

      draw();
    }
  }, [graphicsQuality]);

  const triggerAchievements = async (id: string) => {
    if (!user) return;
    try {
      const unlocked = await unlockAchievement(user.uid, id);
      if (unlocked) {
        onShowNotification('Achievement Unlocked! 🏆', 'Completed: Byte Devourer', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScoreSubmit = async () => {
    if (scoreSubmitted || !user) return;
    setScoreSubmitted(true);

    try {
      await submitScore({
        gameId: 'cyber-snake',
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        score: score,
        achievementsCount: 0,
      });

      onShowNotification('Highscore Saved! 🚀', `Your score of ${score} has been saved!`, 'success');
      onScoreSubmitted();
    } catch (err) {
      console.error(err);
      setScoreSubmitted(false);
    }
  };

  return (
    <div className="w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-6 font-mono text-xs text-zinc-300 relative overflow-hidden flex flex-col md:flex-row gap-6">
      <div className="absolute top-0 right-0 p-4 z-10 flex gap-2">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-zinc-500 hover:text-white transition p-1.5 bg-zinc-900 rounded-lg border border-zinc-850 cursor-pointer"
        >
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
      </div>

      {/* Main Board Arena */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="text-center">
          <h2 className="text-sm font-black tracking-widest text-sky-400 flex items-center justify-center gap-2 uppercase">
            <Gamepad className="animate-pulse" size={14} />
            CYBER SERPENT MATRIX
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Eat byte packets to grow and score telemetry points</p>
        </div>

        {/* Snake Canvas Display */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={360}
            height={360}
            className="border-2 border-zinc-900 bg-black rounded-2xl max-w-full shadow-lg"
          />

          {/* Not Playing overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center rounded-2xl p-6 text-center select-none backdrop-blur-xs">
              {isGameOver ? (
                <>
                  <h3 className="text-red-500 font-extrabold text-sm tracking-widest uppercase">CONNECTION INTERRUPTED</h3>
                  <p className="text-zinc-500 text-[10px] uppercase mt-1">Serpent collided into firewall or tail segments</p>
                  <p className="text-white font-extrabold text-2xl mt-4">SCORE: {score}</p>

                  <div className="flex gap-2.5 mt-6">
                    {user && score > 0 && (
                      <button
                        onClick={handleScoreSubmit}
                        disabled={scoreSubmitted}
                        className={`px-5 py-2.5 rounded-xl font-bold uppercase transition text-[10px] ${
                          scoreSubmitted
                            ? 'bg-zinc-900 text-zinc-600 border border-zinc-850 cursor-not-allowed'
                            : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer active:scale-95'
                        }`}
                      >
                        {scoreSubmitted ? 'SAVED' : 'SAVE SCORE'}
                      </button>
                    )}
                    <button
                      onClick={handleStartGame}
                      className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-xl font-bold uppercase transition text-[10px] cursor-pointer"
                    >
                      RETRY CORE
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sky-400 font-extrabold text-sm tracking-widest uppercase">BYTE CAPTURE CONSOLE</h3>
                  <p className="text-zinc-500 text-[10px] uppercase mt-1">Ready to pilot the network segment tracer</p>

                  <button
                    onClick={handleStartGame}
                    className="px-8 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold uppercase rounded-xl transition mt-6 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-600/10 active:scale-95"
                  >
                    <Play size={13} />
                    <span>INITIALIZE MATRIX RUN</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Control panel & Interactive D-Pad for Mobile users! */}
      <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-zinc-900 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between items-center md:items-start gap-4">
        {/* Score & Length stats */}
        <div className="w-full text-center md:text-left">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">RUN TELEMETRY</h4>
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="bg-zinc-900/50 border border-zinc-900 p-2 rounded-lg">
              <span className="text-[8px] text-zinc-550 uppercase">SCORE</span>
              <div className="text-lg font-black text-white mt-0.5">{score}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-900 p-2 rounded-lg">
              <span className="text-[8px] text-zinc-550 uppercase">LENGTH</span>
              <div className="text-lg font-black text-white mt-0.5">{isPlaying ? snakeRef.current.length : 0}</div>
            </div>
          </div>
        </div>

        {/* Mobile-Friendly Neon D-Pad! */}
        <div className="flex flex-col items-center gap-1 my-3 select-none">
          <span className="text-[8px] text-zinc-550 uppercase tracking-widest mb-1.5">TACTILE NETWORK D-PAD</span>
          <button
            onClick={() => handleSetDirection('UP')}
            className="w-11 h-11 bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl flex items-center justify-center cursor-pointer transition active:scale-95"
            title="UP"
          >
            <ArrowUp size={16} />
          </button>
          <div className="flex gap-6">
            <button
              onClick={() => handleSetDirection('LEFT')}
              className="w-11 h-11 bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl flex items-center justify-center cursor-pointer transition active:scale-95"
              title="LEFT"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={() => handleSetDirection('RIGHT')}
              className="w-11 h-11 bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl flex items-center justify-center cursor-pointer transition active:scale-95"
              title="RIGHT"
            >
              <ArrowRight size={16} />
            </button>
          </div>
          <button
            onClick={() => handleSetDirection('DOWN')}
            className="w-11 h-11 bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl flex items-center justify-center cursor-pointer transition active:scale-95"
            title="DOWN"
          >
            <ArrowDown size={16} />
          </button>
        </div>

        <div className="text-[9px] text-zinc-650 leading-relaxed text-center md:text-left font-mono">
          <span>USE WASD OR ARROW KEYS ON WORKSTATION KEYBOARD OR THE TACTILE D-PAD ABOVE.</span>
        </div>
      </div>
    </div>
  );
}
