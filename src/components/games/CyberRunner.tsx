/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Shield, Zap, Sparkles } from 'lucide-react';
import { submitScore, unlockAchievement } from '../../lib/dbHelper';
import { UserProfile } from '../../types';

interface CyberRunnerProps {
  user: UserProfile | null;
  onScoreSubmitted: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  graphicsQuality?: 'sd' | '1080p' | '4k';
}

export default function CyberRunner({
  user,
  onScoreSubmitted,
  onShowNotification,
  graphicsQuality = '1080p',
}: CyberRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [distance, setDistance] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Keyboard controls
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const gameRef = useRef({
    runner: { x: 80, y: 350, width: 30, height: 40, dy: 0, gravity: 0.7, jumpForce: -13, isGrounded: false, isSliding: false, slideTimer: 0 },
    obstacles: [] as Array<{ x: number; y: number; width: number; height: number; type: 'barrier' | 'overhead'; passed: boolean }>,
    coins: [] as Array<{ x: number; y: number; size: number; collected: boolean }>,
    gridOffset: 0,
    speed: 5,
    distance: 0,
    coinsCollected: 0,
    isOver: false,
    width: 600,
    height: 500,
  });

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const width = Math.min(container.clientWidth, 700);
        const height = 450;

        let multiplier = 2; // 1080p default
        if (graphicsQuality === 'sd') multiplier = 1;
        if (graphicsQuality === '4k') multiplier = 4;

        // CSS style dimensions
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Physical backbuffer resolution
        canvas.width = width * multiplier;
        canvas.height = height * multiplier;

        gameRef.current.width = width;
        gameRef.current.height = height;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [graphicsQuality]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', ' ', 'w', 's'].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const playSound = (type: 'jump' | 'coin' | 'slide' | 'crash') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'slide') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      // Ignored
    }
  };

  const initGame = () => {
    const width = gameRef.current.width;
    const height = gameRef.current.height;

    gameRef.current = {
      runner: {
        x: 80,
        y: height - 100,
        width: 25,
        height: 38,
        dy: 0,
        gravity: 0.65,
        jumpForce: -11.5,
        isGrounded: true,
        isSliding: false,
        slideTimer: 0,
      },
      obstacles: [],
      coins: [],
      gridOffset: 0,
      speed: 4.5,
      distance: 0,
      coinsCollected: 0,
      isOver: false,
      width,
      height,
    };

    setDistance(0);
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let spawnBarrierTimer = 0;
    let spawnCoinTimer = 0;

    const updateAndRender = () => {
      const game = gameRef.current;
      const runner = game.runner;

      let multiplier = 2;
      if (graphicsQuality === 'sd') multiplier = 1;
      if (graphicsQuality === '4k') multiplier = 4;

      ctx.save();
      ctx.scale(multiplier, multiplier);

      // 1. Clear Screen with dark grid ambient background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, game.width, game.height);

      // Neon horizon grid effect
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 1;
      const floorY = game.height - 60;

      // Move floor grid lines
      game.gridOffset = (game.gridOffset + game.speed) % 40;
      for (let x = -game.gridOffset; x < game.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, floorY);
        ctx.lineTo(x - 50, game.height);
        ctx.stroke();
      }

      // Draw Horizon Floor
      ctx.strokeStyle = '#a855f7'; // purple horizon line
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(game.width, floorY);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // 2. Physics & Controls for Runner
      // Jump triggers
      const wantsJump = keysRef.current['ArrowUp'] || keysRef.current[' '] || keysRef.current['w'] || keysRef.current['TouchJump'];
      const wantsSlide = keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['TouchSlide'];

      if (wantsJump && runner.isGrounded && !runner.isSliding) {
        runner.dy = runner.jumpForce;
        runner.isGrounded = false;
        playSound('jump');
      }

      // Slide triggers
      if (wantsSlide && runner.isGrounded && !runner.isSliding) {
        runner.isSliding = true;
        runner.slideTimer = 30; // frames
        runner.height = 20; // smaller bounding box
        runner.y += 18;
        playSound('slide');
      }

      // Slide countdown
      if (runner.isSliding) {
        runner.slideTimer--;
        if (runner.slideTimer <= 0 || wantsJump) {
          runner.isSliding = false;
          runner.height = 38;
          runner.y -= 18;
        }
      }

      // Apply Gravity
      runner.dy += runner.gravity;
      runner.y += runner.dy;

      // Ground Check
      const groundLimit = floorY - runner.height;
      if (runner.y >= groundLimit) {
        runner.y = groundLimit;
        runner.dy = 0;
        runner.isGrounded = true;
      }

      // Distance increment
      game.distance += game.speed / 50;
      const displayDistance = Math.floor(game.distance);
      game.speed = 4.5 + Math.min(6, game.distance / 150); // slow acceleration

      // 3. Spawns
      spawnBarrierTimer++;
      const obstacleSpacing = 90 + Math.random() * 80 - Math.min(30, game.speed * 2);
      if (spawnBarrierTimer > obstacleSpacing) {
        spawnBarrierTimer = 0;
        const isOverhead = Math.random() > 0.6;
        game.obstacles.push({
          x: game.width + 50,
          y: isOverhead ? floorY - 65 : floorY - 30,
          width: isOverhead ? 20 : 18,
          height: isOverhead ? 15 : 30,
          type: isOverhead ? 'overhead' : 'barrier',
          passed: false,
        });
      }

      spawnCoinTimer++;
      if (spawnCoinTimer > 60) {
        spawnCoinTimer = 0;
        game.coins.push({
          x: game.width + 50,
          y: floorY - 50 - Math.random() * 60,
          size: 6,
          collected: false,
        });
      }

      // 4. Update and Draw Obstacles
      ctx.save();
      game.obstacles = game.obstacles.filter((obs) => {
        obs.x -= game.speed;

        // Bounding Box check
        ctx.shadowBlur = 8;
        const color = obs.type === 'overhead' ? '#f43f5e' : '#ec4899'; // pink neon
        ctx.shadowColor = color;
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Score pass
        if (!obs.passed && obs.x + obs.width < runner.x) {
          obs.passed = true;
          game.distance += 5; // bonus distance
        }

        // Collision detection
        const collision =
          runner.x < obs.x + obs.width &&
          runner.x + runner.width > obs.x &&
          runner.y < obs.y + obs.height &&
          runner.y + runner.height > obs.y;

        if (collision) {
          game.isOver = true;
          playSound('crash');
          handleGameOver(Math.floor(game.distance));
          return false;
        }

        return obs.x > -50;
      });
      ctx.restore();

      // 5. Update and Draw Coins
      ctx.save();
      game.coins = game.coins.filter((coin) => {
        coin.x -= game.speed;

        // Spinning coin visual
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#eab308'; // gold neon
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
        ctx.fill();

        // Collision with runner
        const hitCoin =
          coin.x + coin.size > runner.x &&
          coin.x - coin.size < runner.x + runner.width &&
          coin.y + coin.size > runner.y &&
          coin.y - coin.size < runner.y + runner.height;

        if (hitCoin) {
          playSound('coin');
          game.coinsCollected++;
          game.distance += 15; // big distance boost
          return false;
        }

        return coin.x > -50;
      });
      ctx.restore();

      // 6. Draw Runner Character (Neon Cyan Cyber block with trails)
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = '#0891b2';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.fillRect(runner.x, runner.y, runner.width, runner.height);
      ctx.strokeRect(runner.x, runner.y, runner.width, runner.height);

      // Character visor/goggles
      ctx.fillStyle = '#ffffff';
      if (runner.isSliding) {
        ctx.fillRect(runner.x + 12, runner.y + 6, 12, 4);
      } else {
        ctx.fillRect(runner.x + 12, runner.y + 8, 12, 4);
      }
      ctx.restore();

      // HUD Text overlay
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(`DIST: ${displayDistance} m`, 20, 30);
      ctx.fillStyle = '#eab308';
      ctx.fillText(`CYBER-CELLS: ${game.coinsCollected}`, 20, 55);

      setDistance(displayDistance);

      ctx.restore();

      if (!game.isOver) {
        animId = requestAnimationFrame(updateAndRender);
      }
    };

    animId = requestAnimationFrame(updateAndRender);
    return () => cancelAnimationFrame(animId);
  }, [gameState, graphicsQuality]);

  const handleGameOver = async (finalDistance: number) => {
    setGameState('gameover');
    if (finalDistance > highScore) {
      setHighScore(finalDistance);
    }

    if (user) {
      try {
        await submitScore({
          gameId: 'cyber-runner',
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          score: finalDistance,
          achievementsCount: 0,
        });

        // Trigger First-Play achievement
        await unlockAchievement(user.uid, 'first-play');

        // Check scores for Runner achievements
        if (finalDistance >= 500) {
          const unlocked = await unlockAchievement(user.uid, 'first-score-runner');
          if (unlocked) {
            onShowNotification('Achievement Unlocked!', 'Cyber Aspirant: Ran 500m+!', 'success');
          }
        }
        if (finalDistance >= 2000) {
          const unlocked = await unlockAchievement(user.uid, 'elite-score-runner');
          if (unlocked) {
            onShowNotification('Achievement Unlocked!', 'Light-Speed Runner: Ran 2,000m+!', 'success');
          }
        }

        onScoreSubmitted();
      } catch (err) {
        console.error('Error submitting cyber-runner score:', err);
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center bg-zinc-950 p-4 border border-zinc-800 rounded-2xl shadow-2xl relative overflow-hidden">
      {/* HUD */}
      <div className="w-full flex justify-between items-center mb-3 text-zinc-400 text-xs px-2 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          <span>GRID: GRIDRUNNER 2099 v1.0.4</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="hover:text-purple-400 p-1 rounded transition-colors"
            title="Toggle SFX"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <span>BEST RUN: {highScore}m</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative border border-zinc-800/80 rounded-xl overflow-hidden bg-black max-w-full">
        <canvas
          ref={canvasRef}
          className="block mx-auto cursor-pointer"
          style={{ maxWidth: '100%' }}
        />

        {/* Start / Restart overlays */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
            <Sparkles className="text-purple-500 w-12 h-12 mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight font-sans">GRIDRUNNER 2099</h3>
            <p className="text-zinc-400 text-sm max-w-md mb-6 leading-relaxed font-mono">
              Avoid roadblocks by jumping (<span className="text-purple-400 font-bold">UP / Space</span>) or sliding (<span className="text-purple-400 font-bold">DOWN</span>). Cyber-cells give massive score multipliers!
            </p>
            <button
              onClick={initGame}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium tracking-wide shadow-lg shadow-purple-600/30 active:scale-95 transition"
            >
              <Play size={18} fill="currentColor" /> Initialize Run
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <span className="text-red-500 font-bold tracking-widest text-lg mb-2 font-mono">GRID SPEED OVERLOAD</span>
            <h3 className="text-3xl font-extrabold text-white mb-4">TERMINATED</h3>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-6 min-w-[200px] font-mono">
              <div className="text-zinc-400 text-xs">TOTAL DISTANCE</div>
              <div className="text-4xl font-black text-purple-400 mt-1">{distance} m</div>
            </div>
            {!user && (
              <p className="text-yellow-400/90 text-xs mb-4 font-mono max-w-xs">
                ⚠️ Login to save your runs to the Leaderboard & earn Achievements!
              </p>
            )}
            <button
              onClick={initGame}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium tracking-wide border border-zinc-700 transition"
            >
              <RotateCcw size={18} /> Restart Grid
            </button>
          </div>
        )}
      </div>

      {/* Touch controls for mobile */}
      <div className="w-full grid grid-cols-2 gap-3 mt-4 max-w-sm md:hidden font-mono">
        <button
          onTouchStart={() => { keysRef.current['TouchJump'] = true; }}
          onTouchEnd={() => { keysRef.current['TouchJump'] = false; }}
          className="bg-purple-950/40 active:bg-purple-900/60 text-purple-400 border border-purple-800 py-3 rounded-lg flex items-center justify-center font-bold select-none"
        >
          ▲ JUMP
        </button>
        <button
          onTouchStart={() => { keysRef.current['TouchSlide'] = true; }}
          onTouchEnd={() => { keysRef.current['TouchSlide'] = false; }}
          className="bg-zinc-900 active:bg-zinc-800 text-zinc-400 border border-zinc-800 py-3 rounded-lg flex items-center justify-center font-bold select-none"
        >
          ▼ SLIDE
        </button>
      </div>
    </div>
  );
}
