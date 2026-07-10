/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Shield, Zap, Sparkles } from 'lucide-react';
import { submitScore, unlockAchievement } from '../../lib/dbHelper';
import { UserProfile } from '../../types';

interface SpaceShooterProps {
  user: UserProfile | null;
  onScoreSubmitted: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  graphicsQuality?: 'sd' | '1080p' | '4k';
}

export default function SpaceShooter({
  user,
  onScoreSubmitted,
  onShowNotification,
  graphicsQuality = '1080p',
}: SpaceShooterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scoreListUpdated, setScoreListUpdated] = useState(false);

  // Keyboard controls
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Game assets / references for the loop
  const gameRef = useRef({
    player: { x: 0, y: 0, width: 40, height: 35, speed: 6, shield: 0, weaponLevel: 1 },
    bullets: [] as Array<{ x: number; y: number; r: number; dy: number; power: number }>,
    enemies: [] as Array<{ x: number; y: number; width: 30; height: 30; speed: number; hp: number; type: number }>,
    particles: [] as Array<{ x: number; y: number; dx: number; dy: number; r: number; color: string; alpha: number; maxLife: number; life: number }>,
    powerups: [] as Array<{ x: number; y: number; width: 25; height: 25; type: 'shield' | 'zap' | 'weapon'; speed: number }>,
    stars: [] as Array<{ x: number; y: number; size: number; speed: number }>,
    lastShot: 0,
    score: 0,
    isOver: false,
    width: 600,
    height: 500,
  });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const width = Math.min(container.clientWidth, 700);
        const height = 500;

        let multiplier = 2; // 1080p FHD default
        if (graphicsQuality === 'sd') multiplier = 1;
        if (graphicsQuality === '4k') multiplier = 4;

        // CSS Display dimensions (logical size)
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Physical render backbuffer resolution (1080p / 4K)
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

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
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

  // Simple Synthesizer Audio FX
  const playSound = (type: 'laser' | 'explosion' | 'powerup' | 'gameover') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'explosion') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      // Ignored
    }
  };

  const createExplosion = (x: number, y: number, color = '#a855f7') => {
    const pCount = 15;
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      gameRef.current.particles.push({
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 3,
        color,
        alpha: 1,
        maxLife: 20 + Math.random() * 30,
        life: 0,
      });
    }
    playSound('explosion');
  };

  const initGame = () => {
    const width = gameRef.current.width;
    const height = gameRef.current.height;

    // Stars background
    const stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.2 + Math.random() * 0.8,
      });
    }

    gameRef.current = {
      player: {
        x: width / 2 - 20,
        y: height - 60,
        width: 40,
        height: 35,
        speed: 6,
        shield: 0,
        weaponLevel: 1,
      },
      bullets: [],
      enemies: [],
      particles: [],
      powerups: [],
      stars,
      lastShot: 0,
      score: 0,
      isOver: false,
      width,
      height,
    };

    setScore(0);
    setGameState('playing');
  };

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let spawnTimer = 0;
    let powerupTimer = 0;

    const updateAndRender = () => {
      const now = Date.now();
      const game = gameRef.current;

      let multiplier = 2;
      if (graphicsQuality === 'sd') multiplier = 1;
      if (graphicsQuality === '4k') multiplier = 4;

      ctx.save();
      ctx.scale(multiplier, multiplier);

      // Clear Canvas
      ctx.fillStyle = '#09090b'; // zinc-950
      ctx.fillRect(0, 0, game.width, game.height);

      // 1. Draw Stars Background
      ctx.fillStyle = '#ffffff';
      game.stars.forEach((star) => {
        star.y += star.speed;
        if (star.y > game.height) {
          star.y = 0;
          star.x = Math.random() * game.width;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // 2. Spawn Enemies
      spawnTimer++;
      const spawnInterval = Math.max(30, 80 - Math.floor(game.score / 1000) * 5);
      if (spawnTimer > spawnInterval) {
        spawnTimer = 0;
        const type = Math.random() > 0.8 ? 2 : 1; // elite vs normal
        game.enemies.push({
          x: 20 + Math.random() * (game.width - 60),
          y: -30,
          width: type === 2 ? 38 : 28,
          height: type === 2 ? 38 : 28,
          speed: 1.5 + Math.random() * 2 + Math.min(2, game.score / 3000),
          hp: type === 2 ? 3 : 1,
          type,
        });
      }

      // 3. Spawn Powerups
      powerupTimer++;
      if (powerupTimer > 400) {
        powerupTimer = 0;
        const types: Array<'shield' | 'zap' | 'weapon'> = ['shield', 'zap', 'weapon'];
        const type = types[Math.floor(Math.random() * types.length)];
        game.powerups.push({
          x: 30 + Math.random() * (game.width - 60),
          y: -20,
          width: 20,
          height: 20,
          type,
          speed: 1.5,
        });
      }

      // 4. Update Player Movement
      const player = game.player;
      if (keysRef.current['ArrowLeft'] || keysRef.current['a']) {
        player.x = Math.max(0, player.x - player.speed);
      }
      if (keysRef.current['ArrowRight'] || keysRef.current['d']) {
        player.x = Math.min(game.width - player.width, player.x + player.speed);
      }
      if (keysRef.current['ArrowUp'] || keysRef.current['w']) {
        player.y = Math.max(0, player.y - player.speed);
      }
      if (keysRef.current['ArrowDown'] || keysRef.current['s']) {
        player.y = Math.min(game.height - player.height, player.y + player.speed);
      }

      // Touch buttons support directly
      if (keysRef.current['TouchLeft']) {
        player.x = Math.max(0, player.x - player.speed);
      }
      if (keysRef.current['TouchRight']) {
        player.x = Math.min(game.width - player.width, player.x + player.speed);
      }

      // Auto firing or Space firing
      if (keysRef.current[' '] || keysRef.current['TouchFire'] || now - game.lastShot > 280) {
        if (now - game.lastShot > 250) {
          game.lastShot = now;
          playSound('laser');
          if (player.weaponLevel === 1) {
            game.bullets.push({ x: player.x + player.width / 2, y: player.y, r: 3, dy: -8, power: 1 });
          } else if (player.weaponLevel === 2) {
            game.bullets.push({ x: player.x + 8, y: player.y, r: 3, dy: -8, power: 1 });
            game.bullets.push({ x: player.x + player.width - 8, y: player.y, r: 3, dy: -8, power: 1 });
          } else {
            game.bullets.push({ x: player.x + player.width / 2, y: player.y - 4, r: 4, dy: -9, power: 2 });
            game.bullets.push({ x: player.x + 4, y: player.y + 6, r: 3, dy: -8, power: 1 });
            game.bullets.push({ x: player.x + player.width - 4, y: player.y + 6, r: 3, dy: -8, power: 1 });
          }
        }
      }

      // Draw Player Ship (Neon Cyberpunk Triangle with Exhaust)
      ctx.save();
      // Draw engine fire particle
      ctx.fillStyle = Math.random() > 0.5 ? '#ff0055' : '#ff9900';
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y + player.height + 10);
      ctx.lineTo(player.x + player.width / 2 - 8, player.y + player.height);
      ctx.lineTo(player.x + player.width / 2 + 8, player.y + player.height);
      ctx.closePath();
      ctx.fill();

      // Ship body
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#60a5fa'; // neon blue
      ctx.fillStyle = '#2563eb';
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x, player.y + player.height);
      ctx.lineTo(player.x + player.width / 2, player.y + player.height - 8);
      ctx.lineTo(player.x + player.width, player.y + player.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shield active ring
      if (player.shield > 0) {
        ctx.strokeStyle = '#10b981'; // neon green
        ctx.shadowColor = '#10b981';
        ctx.lineWidth = 2 + Math.sin(now / 50) * 1.5;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 5. Update Bullets
      game.bullets = game.bullets.filter((b) => {
        b.y += b.dy;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06b6d4'; // cyan laser
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        return b.y > -10;
      });

      // 6. Update Powerups
      game.powerups = game.powerups.filter((p) => {
        p.y += p.speed;

        // Draw Powerup
        ctx.save();
        ctx.shadowBlur = 12;
        let pColor = '#3b82f6';
        if (p.type === 'shield') pColor = '#10b981';
        if (p.type === 'zap') pColor = '#f59e0b';
        if (p.type === 'weapon') pColor = '#ec4899';

        ctx.strokeStyle = pColor;
        ctx.fillStyle = '#1e1b4b';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Core icon placeholder
        ctx.fillStyle = pColor;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.type[0].toUpperCase(), p.x + p.width / 2, p.y + p.height / 2 + 3);
        ctx.restore();

        // Collision with player
        const hitPlayer =
          p.x < player.x + player.width &&
          p.x + p.width > player.x &&
          p.y < player.y + player.height &&
          p.y + p.height > player.y;

        if (hitPlayer) {
          playSound('powerup');
          if (p.type === 'shield') {
            player.shield = 2;
            onShowNotification('Shield Restored!', 'Invulnerability barrier is active!', 'success');
          } else if (p.type === 'zap') {
            // Blow up all current enemies
            game.enemies.forEach((enemy) => {
              createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f59e0b');
              game.score += enemy.type === 2 ? 200 : 100;
            });
            game.enemies = [];
            onShowNotification('Hyper Zap Blast!', 'All active enemy hostiles neutralized!', 'info');
          } else if (p.type === 'weapon') {
            player.weaponLevel = Math.min(3, player.weaponLevel + 1);
            onShowNotification('Weapon Upgraded!', 'Blaster firepower increased!', 'success');
          }
          return false;
        }

        return p.y < game.height + 20;
      });

      // 7. Update Enemies
      game.enemies = game.enemies.filter((e) => {
        e.y += e.speed;

        // Draw Enemy Alien (Neon purple/orange diamond)
        ctx.save();
        ctx.shadowBlur = 8;
        const eColor = e.type === 2 ? '#f97316' : '#a855f7';
        ctx.shadowColor = eColor;
        ctx.strokeStyle = eColor;
        ctx.fillStyle = '#0f172a';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(e.x + e.width / 2, e.y);
        ctx.lineTo(e.x + e.width, e.y + e.height / 2);
        ctx.lineTo(e.x + e.width / 2, e.y + e.height);
        ctx.lineTo(e.x, e.y + e.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x + e.width / 2 - 4, e.y + e.height / 2 - 3, 2, 2);
        ctx.fillRect(e.x + e.width / 2 + 2, e.y + e.height / 2 - 3, 2, 2);
        ctx.restore();

        // Collision with bullets
        game.bullets.forEach((b) => {
          const hitEnemy =
            b.x > e.x &&
            b.x < e.x + e.width &&
            b.y > e.y &&
            b.y < e.y + e.height;

          if (hitEnemy) {
            e.hp -= b.power;
            b.y = -100; // destroy bullet
            if (e.hp <= 0) {
              createExplosion(e.x + e.width / 2, e.y + e.height / 2, eColor);
              game.score += e.type === 2 ? 150 : 50;
            } else {
              playSound('laser');
            }
          }
        });

        if (e.hp <= 0) return false;

        // Collision with player
        const hitPlayer =
          e.x < player.x + player.width &&
          e.x + e.width > player.x &&
          e.y < player.y + player.height &&
          e.y + e.height > player.y;

        if (hitPlayer) {
          if (player.shield > 0) {
            player.shield--;
            createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#10b981');
            return false;
          } else {
            // Game Over
            createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ef4444');
            game.isOver = true;
            playSound('gameover');
            handleGameOver(game.score);
            return false;
          }
        }

        // Out of bounds penalty
        if (e.y > game.height) {
          game.score = Math.max(0, game.score - 20); // Penalty
          return false;
        }

        return true;
      });

      // 8. Update Particles (Visual feedback)
      game.particles = game.particles.filter((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return p.life < p.maxLife;
      });

      // Draw Score Text overlay
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(`SCORE: ${game.score}`, 20, 30);
      if (player.weaponLevel > 1) {
        ctx.fillStyle = '#ec4899';
        ctx.fillText(`WEAPON: LVL ${player.weaponLevel}`, game.width - 150, 30);
      }

      setScore(game.score);

      ctx.restore();

      if (!game.isOver) {
        animId = requestAnimationFrame(updateAndRender);
      }
    };

    animId = requestAnimationFrame(updateAndRender);
    return () => cancelAnimationFrame(animId);
  }, [gameState, graphicsQuality]);

  const handleGameOver = async (finalScore: number) => {
    setGameState('gameover');
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }

    // Submit Score & Achievements if signed in
    if (user) {
      try {
        await submitScore({
          gameId: 'space-shooter',
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          score: finalScore,
          achievementsCount: 0,
        });

        // Trigger First-Play achievement
        await unlockAchievement(user.uid, 'first-play');

        // Check scores for Space-shooter achievements
        if (finalScore >= 1000) {
          const unlocked = await unlockAchievement(user.uid, 'first-score-shooter');
          if (unlocked) {
            onShowNotification('Achievement Unlocked!', 'Star Cadet: Scored 1,000+ points!', 'success');
          }
        }
        if (finalScore >= 5000) {
          const unlocked = await unlockAchievement(user.uid, 'elite-score-shooter');
          if (unlocked) {
            onShowNotification('Achievement Unlocked!', 'Galaxy Legend: Scored 5,000+ points!', 'success');
          }
        }

        onScoreSubmitted();
      } catch (err) {
        console.error('Error submitting scoreboard score:', err);
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center bg-zinc-950 p-4 border border-zinc-800 rounded-2xl shadow-2xl relative overflow-hidden">
      {/* HUD Bar */}
      <div className="w-full flex justify-between items-center mb-3 text-zinc-400 text-xs px-2 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>SYSTEM: NEON ODYSSEY v1.2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="hover:text-blue-400 p-1 rounded transition-colors"
            title="Toggle SFX"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <span>HIGH: {highScore}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative border border-zinc-800/80 rounded-xl overflow-hidden bg-black max-w-full">
        <canvas
          ref={canvasRef}
          className="block mx-auto cursor-crosshair"
          style={{ maxWidth: '100%' }}
        />

        {/* Start / Restart overlays */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
            <Sparkles className="text-blue-500 w-12 h-12 mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight font-sans">NEON ODYSSEY</h3>
            <p className="text-zinc-400 text-sm max-w-md mb-6 leading-relaxed font-mono">
              Use <span className="text-blue-400 font-bold">W, A, S, D / Arrow Keys</span> to fly, and score points by blasting vector asteroids. Shoot glowing cubes to upgrade weapon blasters!
            </p>
            <button
              onClick={initGame}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium tracking-wide shadow-lg shadow-blue-600/30 active:scale-95 transition"
            >
              <Play size={18} fill="currentColor" /> Play Now
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <span className="text-red-500 font-bold tracking-widest text-lg mb-2 font-mono">HULL INTEGRITY COMPROMISED</span>
            <h3 className="text-3xl font-extrabold text-white mb-4">GAME OVER</h3>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-6 min-w-[200px] font-mono">
              <div className="text-zinc-400 text-xs">FINAL SCORE</div>
              <div className="text-4xl font-black text-blue-400 mt-1">{score}</div>
            </div>
            {!user && (
              <p className="text-yellow-400/90 text-xs mb-4 font-mono max-w-xs">
                ⚠️ Login to save your scores to the Leaderboard & earn Achievements!
              </p>
            )}
            <button
              onClick={initGame}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium tracking-wide border border-zinc-700 transition"
            >
              <RotateCcw size={18} /> Pilot Again
            </button>
          </div>
        )}
      </div>

      {/* Touch controls for mobile */}
      <div className="w-full grid grid-cols-3 gap-2 mt-4 max-w-sm md:hidden">
        <button
          onTouchStart={() => { keysRef.current['TouchLeft'] = true; }}
          onTouchEnd={() => { keysRef.current['TouchLeft'] = false; }}
          className="bg-zinc-900 active:bg-zinc-800 text-zinc-400 border border-zinc-800 py-3 rounded-lg flex items-center justify-center select-none"
        >
          ◀ LEFT
        </button>
        <button
          onTouchStart={() => { keysRef.current['TouchFire'] = true; }}
          onTouchEnd={() => { keysRef.current['TouchFire'] = false; }}
          className="bg-blue-900/40 active:bg-blue-800/60 text-blue-400 border border-blue-800 py-3 rounded-lg flex items-center justify-center font-bold select-none"
        >
          FIRE
        </button>
        <button
          onTouchStart={() => { keysRef.current['TouchRight'] = true; }}
          onTouchEnd={() => { keysRef.current['TouchRight'] = false; }}
          className="bg-zinc-900 active:bg-zinc-800 text-zinc-400 border border-zinc-800 py-3 rounded-lg flex items-center justify-center select-none"
        >
          RIGHT ▶
        </button>
      </div>
    </div>
  );
}
