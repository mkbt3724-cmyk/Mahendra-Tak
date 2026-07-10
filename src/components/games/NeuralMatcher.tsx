/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Brain, Trophy, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { submitScore, unlockAchievement } from '../../lib/dbHelper';
import { UserProfile } from '../../types';

interface NeuralMatcherProps {
  user: UserProfile | null;
  onScoreSubmitted: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  graphicsQuality?: 'sd' | '1080p' | '4k';
}

export default function NeuralMatcher({
  user,
  onScoreSubmitted,
  onShowNotification,
  graphicsQuality = '1080p',
}: NeuralMatcherProps) {
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState<number[]>(Array(9).fill(0)); // 3x3 grid
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'showing' | 'player_turn' | 'gameover'>('idle');
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playingRef = useRef(false);

  const playSound = (type: 'beep' | 'success' | 'fail' | 'start') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440 + level * 30, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'start') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Ignored
    }
  };

  const startGame = () => {
    setLevel(1);
    const firstTile = Math.floor(Math.random() * 9);
    setSequence([firstTile]);
    setPlayerSequence([]);
    setGameState('showing');
    playSound('start');
  };

  // Run showing sequence
  useEffect(() => {
    if (gameState !== 'showing' || sequence.length === 0) return;

    let index = 0;
    const intervalTime = Math.max(250, 600 - level * 35); // faster sequence for higher levels

    const showNext = () => {
      const tileId = sequence[index];
      setActiveTile(tileId);
      playSound('beep');

      setTimeout(() => {
        setActiveTile(null);
        index++;

        if (index < sequence.length) {
          setTimeout(showNext, 150); // Gap between tiles
        } else {
          setPlayerSequence([]);
          setGameState('player_turn');
        }
      }, intervalTime);
    };

    // Delay start of sequence slightly
    const startTimeout = setTimeout(showNext, 500);
    return () => clearTimeout(startTimeout);
  }, [gameState, sequence]);

  const handleTileClick = (tileId: number) => {
    if (gameState !== 'player_turn') return;

    setActiveTile(tileId);
    playSound('beep');
    setTimeout(() => setActiveTile(null), 150);

    const nextPlayerSeq = [...playerSequence, tileId];
    setPlayerSequence(nextPlayerSeq);

    // Verify correct selection
    const currentIndex = nextPlayerSeq.length - 1;
    if (tileId !== sequence[currentIndex]) {
      // Failed! Game Over
      playSound('fail');
      handleGameOver(level);
      return;
    }

    // Finished current round successfully
    if (nextPlayerSeq.length === sequence.length) {
      playSound('success');
      setGameState('showing');
      const nextLevel = level + 1;
      setLevel(nextLevel);

      // Append new random item to sequence
      const newRandomTile = Math.floor(Math.random() * 9);
      setSequence([...sequence, newRandomTile]);
    }
  };

  const handleGameOver = async (finalLevel: number) => {
    setGameState('gameover');
    const calculatedScore = finalLevel * 100 + (sequence.length * 10);
    if (calculatedScore > highScore) {
      setHighScore(calculatedScore);
    }

    if (user) {
      try {
        await submitScore({
          gameId: 'memory-matrix',
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          score: calculatedScore,
          achievementsCount: 0,
        });

        await unlockAchievement(user.uid, 'first-play');

        if (finalLevel >= 10) {
          const unlocked = await unlockAchievement(user.uid, 'score-matrix');
          if (unlocked) {
            onShowNotification('Achievement Unlocked!', 'Hyper-Brain: Reached memory Level 10!', 'success');
          }
        }

        onScoreSubmitted();
      } catch (err) {
        console.error('Error submitting neural-matcher score:', err);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center bg-zinc-950 p-6 border border-zinc-800 rounded-2xl shadow-2xl relative">
      {/* Title / Controls */}
      <div className="w-full flex justify-between items-center mb-5 text-zinc-400 text-xs font-mono border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Brain className="text-cyan-400 w-4 h-4 animate-pulse" />
          <span>NEURAL: NEURAL MATCHER v1.0.1</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="hover:text-cyan-400 p-1 rounded transition-colors"
            title="Toggle SFX"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <span>LEVEL: {level}</span>
          <span>BEST: {highScore}</span>
        </div>
      </div>

      {/* Grid Canvas Game Area */}
      <div className="w-full flex flex-col items-center">
        <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl w-full max-w-[320px] aspect-square">
          {grid.map((_, idx) => {
            const isFlashed = activeTile === idx;
            return (
              <button
                key={idx}
                disabled={gameState !== 'player_turn'}
                onClick={() => handleTileClick(idx)}
                className={`aspect-square rounded-xl border font-bold text-lg transition-all duration-150 relative overflow-hidden ${
                  isFlashed
                    ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/50 scale-95'
                    : 'bg-zinc-850 hover:bg-zinc-800/80 border-zinc-850 text-zinc-500 active:scale-95'
                }`}
              >
                {/* Neon center bulb dot */}
                <span className={`absolute w-1.5 h-1.5 rounded-full transition-all ${isFlashed ? 'bg-white scale-125' : 'bg-cyan-500/20'}`} />
              </button>
            );
          })}
        </div>

        {/* Status Text overlay */}
        <div className="mt-4 font-mono text-xs font-semibold tracking-wide text-center">
          {gameState === 'showing' && (
            <span className="text-cyan-400 animate-pulse">MEMORIZING NEURAL SIGNALS...</span>
          )}
          {gameState === 'player_turn' && (
            <span className="text-emerald-400">REPLICATING SEQUENCE: {playerSequence.length} / {sequence.length}</span>
          )}
          {gameState === 'idle' && (
            <span className="text-zinc-500">READY TO RECALL SEQUENCE DATA</span>
          )}
        </div>
      </div>

      {/* States */}
      {gameState === 'idle' && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center rounded-2xl">
          <Sparkles className="text-cyan-400 w-12 h-12 mb-4 animate-bounce" />
          <h3 className="text-2xl font-bold text-white mb-2">NEURAL MATCHER</h3>
          <p className="text-zinc-400 text-sm max-w-xs mb-6 leading-relaxed">
            Boost your spatial memory recall! Replicate the sequence of glowing neon blocks. Unlocks high ranks at Level 10.
          </p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition shadow-lg shadow-cyan-600/30 active:scale-95"
          >
            Start Memory Recall
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-fade-in">
          <Brain className="text-red-500 w-16 h-16 mb-4 animate-pulse" />
          <h3 className="text-3xl font-extrabold text-white mb-2">SEQUENCE DISRUPTED</h3>
          <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed font-mono">
            Brain waves fell out of sync at level <span className="text-cyan-400 font-bold">{level}</span>. Reset buffer and synchronize again.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl mb-6 min-w-[160px] font-mono">
            <div className="text-zinc-500 text-xs">RECALL SCORE</div>
            <div className="text-3xl font-black text-cyan-400 mt-0.5">{level * 100 + sequence.length * 10}</div>
          </div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition border border-zinc-700 shadow-lg"
          >
            Resync Sequence
          </button>
        </div>
      )}
    </div>
  );
}
