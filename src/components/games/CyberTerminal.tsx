/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad,
  Terminal,
  Cpu,
  Shield,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronRight,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { submitScore, unlockAchievement } from '../../lib/dbHelper';

interface CyberTerminalProps {
  game: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  user: UserProfile | null;
  onScoreSubmitted: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  graphicsQuality?: 'sd' | '1080p' | '4k';
}

export default function CyberTerminal({
  game,
  user,
  onScoreSubmitted,
  onShowNotification,
  graphicsQuality = '1080p',
}: CyberTerminalProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem(`gameverse_terminal_hs_${game.id}`) || '0');
  });
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Gameplay specific states
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [playerHp, setPlayerHp] = useState(100);
  const [energy, setEnergy] = useState(50);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [currentNode, setCurrentNode] = useState('MAIN_ROOT');
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [promptOptions, setPromptOptions] = useState<Array<{ label: string; action: () => void }>>([]);

  // Timing game state (for action/racing timing)
  const [targetIndicator, setTargetIndicator] = useState<{ active: boolean; position: number; size: number }>({
    active: false,
    position: 50,
    size: 20,
  });
  const [laserPosition, setLaserPosition] = useState(0);
  const [laserDirection, setLaserDirection] = useState<'left' | 'right'>('right');

  const logTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) => {
    setSystemLogs((prev) => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
      } catch (_) {}
    }
  };

  const playSuccessBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (_) {}
  };

  const playFailureBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (_) {}
  };

  // Start a new game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setPlayerHp(100);
    setEnergy(50);
    setSpeedMultiplier(1.0);
    setScoreSubmitted(false);
    setSystemLogs([]);
    addLog(`INIT: Synchronizing simulator deck for "${game.title}"`);
    addLog(`SYS: Host system category identified as [${game.category.toUpperCase()}]`);
    addLog(`SYS: Loading quantum logic registers...`);
    bootLevel('ROOT_MAIN');
  };

  // Level Router based on category
  const bootLevel = (nodeName: string) => {
    setCurrentNode(nodeName);

    if (game.category.toLowerCase() === 'rpg' || game.category.toLowerCase() === 'strategy' || game.category.toLowerCase() === 'adventure') {
      runRpgNode(nodeName);
    } else {
      // Action or Racing categories
      runActionNode();
    }
  };

  // --- RPG / STRATEGY / ADVENTURE GAMEPLAY LOOP ---
  const runRpgNode = (nodeName: string) => {
    if (nodeName === 'ROOT_MAIN') {
      setActivePrompt('You have bypassed the initial firewall nodes. Deep mainframe clusters are visible. Choose your entry gate:');
      setPromptOptions([
        {
          label: '⚡ PORT 8080: Core Injection (Risky, High Score)',
          action: () => {
            addLog('SYS: Bypassing port 8080 core registers...');
            if (Math.random() > 0.4) {
              setScore((s) => s + 350);
              setEnergy((e) => Math.min(100, e + 20));
              playSuccessBeep();
              addLog('SUCCESS: Firewall defeated! +350 score.');
              bootLevel('CLUSTER_ALPHA');
            } else {
              setPlayerHp((h) => Math.max(0, h - 30));
              playFailureBeep();
              addLog('ALERT: Port scanner defensive counter-measures activated! -30 HP.');
              bootLevel('ROOT_MAIN');
            }
          },
        },
        {
          label: '🧭 PORT 443: Stealth Probe (Safe, Low Score)',
          action: () => {
            addLog('SYS: Encrypting trace parameters...');
            setScore((s) => s + 150);
            playSuccessBeep();
            addLog('SUCCESS: Stealth breach clear. +150 score.');
            bootLevel('CLUSTER_BETA');
          },
        },
        {
          label: '🛡️ Local Database Buffer: Gather power-ups',
          action: () => {
            addLog('SYS: Downloading cache records...');
            setEnergy((e) => Math.min(100, e + 40));
            playSuccessBeep();
            addLog('SUCCESS: Restored 40 Energy Units.');
            bootLevel('ROOT_MAIN');
          },
        },
      ]);
    } else if (nodeName === 'CLUSTER_ALPHA') {
      setActivePrompt('SENTRY ALERT: A Level 4 Cyber Security Drone blocks the vector path. Secure protocol bypass required!');
      setPromptOptions([
        {
          label: '🔥 Execute Overdrive Exploit (Consumes 30 Energy)',
          action: () => {
            setEnergy((e) => {
              if (e >= 30) {
                addLog('SYS: Igniting overdrive payload...');
                setScore((s) => s + 600);
                playSuccessBeep();
                addLog('DEFEATED: Security Drone bypassed successfully! +600 score.');
                setTimeout(() => bootLevel('CORE_MAINFRAME'), 400);
                return e - 30;
              } else {
                addLog('ERROR: Insufficient Energy! Exploit failed.');
                setPlayerHp((h) => Math.max(0, h - 25));
                playFailureBeep();
                return e;
              }
            });
          },
        },
        {
          label: '💻 Decrypt Bypass Vector (Math Pattern Decryption)',
          action: () => {
            const decryptSuccess = Math.random() > 0.3;
            if (decryptSuccess) {
              setScore((s) => s + 450);
              playSuccessBeep();
              addLog('DECRYPTED: Found encryption key flaw! +450 score.');
              bootLevel('CORE_MAINFRAME');
            } else {
              setPlayerHp((h) => Math.max(0, h - 40));
              playFailureBeep();
              addLog('ALERT: Decryption failure! Mainframe feedback shockwave! -40 HP.');
              bootLevel('CLUSTER_ALPHA');
            }
          },
        },
      ]);
    } else if (nodeName === 'CLUSTER_BETA') {
      setActivePrompt('The routing deck split. Signals show high energy radiation fields. Select redirection vector:');
      setPromptOptions([
        {
          label: '⚡ Hyper Jump Route (Speeds up simulation)',
          action: () => {
            setSpeedMultiplier((sm) => sm + 0.5);
            setScore((s) => s + 300);
            playSuccessBeep();
            addLog('SPEED INCREASE: Mainframe time-slice multiplier upgraded!');
            bootLevel('CORE_MAINFRAME');
          },
        },
        {
          label: '🧬 Core Diagnostic bypass',
          action: () => {
            setScore((s) => s + 200);
            setPlayerHp((h) => Math.min(100, h + 15));
            playSuccessBeep();
            addLog('RECOVERY: Repaired core grid lines +15 HP.');
            bootLevel('CORE_MAINFRAME');
          },
        },
      ]);
    } else if (nodeName === 'CORE_MAINFRAME') {
      setActivePrompt('MAINFRAME REACHED: The core vector engine is exposed. Final core strike sequence ready!');
      setPromptOptions([
        {
          label: '🚀 FULL BREACH: Explode Mainframe Grid',
          action: () => {
            addLog('SYS: Deploying thermonuclear packet payload...');
            const finalRoll = Math.random();
            if (finalRoll > 0.25) {
              setScore((s) => s + 1500);
              playSuccessBeep();
              addLog('CRITICAL WIN: Mainframe database completely unlocked! +1500 score!');
              triggerAchievements('cyber-oracle-breach');
              handleGameOver(score + 1500);
            } else {
              setPlayerHp(0);
              playFailureBeep();
              addLog('ALERT: Core blast shields detonated! Absolute connection loss.');
              handleGameOver(score);
            }
          },
        },
        {
          label: '🔌 Extraction Stream: Safely siphon credits and exit',
          action: () => {
            addLog('SYS: Initiating safe siphoning extraction flow...');
            setScore((s) => s + 800);
            playSuccessBeep();
            addLog('SUCCESS: Siphoned final files. Connection terminated cleanly.');
            handleGameOver(score + 800);
          },
        },
      ]);
    }
  };

  // --- ACTION / RACING GAMEPLAY LOOP (Real-time Deflection/Steering meter) ---
  const runActionNode = () => {
    setActivePrompt('OVERDRIVE TIMING MODE: Align the laser charge or shield coordinate precisely with the green vector zone!');
    // Trigger real-time visual meter game loop
    setTargetIndicator({
      active: true,
      position: 30 + Math.floor(Math.random() * 40),
      size: 25 - Math.min(15, Math.floor(score / 200)), // gets smaller as score scales
    });
  };

  // Update loop for target/laser indicator animation
  useEffect(() => {
    if (gameState !== 'playing' || !targetIndicator.active) return;

    const interval = setInterval(() => {
      setLaserPosition((pos) => {
        let nextPos = pos;
        if (laserDirection === 'right') {
          nextPos = pos + 4 * speedMultiplier;
          if (nextPos >= 100) {
            setLaserDirection('left');
            nextPos = 100;
          }
        } else {
          nextPos = pos - 4 * speedMultiplier;
          if (nextPos <= 0) {
            setLaserDirection('right');
            nextPos = 0;
          }
        }
        return nextPos;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [gameState, targetIndicator.active, laserDirection, speedMultiplier]);

  // Handle reflex click for timing zone
  const handleTimingClick = () => {
    if (gameState !== 'playing' || !targetIndicator.active) return;

    const minTarget = targetIndicator.position - targetIndicator.size / 2;
    const maxTarget = targetIndicator.position + targetIndicator.size / 2;

    if (laserPosition >= minTarget && laserPosition <= maxTarget) {
      // Success hit!
      const gained = Math.round(150 * speedMultiplier);
      setScore((s) => s + gained);
      setEnergy((e) => Math.min(100, e + 15));
      setSpeedMultiplier((sm) => Math.min(3.5, sm + 0.15));
      playSuccessBeep();
      addLog(`CRITICAL HIT: Core alignment optimal! +${gained} score.`);

      // Setup new target indicator
      setTargetIndicator({
        active: true,
        position: 25 + Math.floor(Math.random() * 50),
        size: Math.max(8, 25 - Math.floor(score / 150)),
      });
    } else {
      // Deflection failure
      const penalty = Math.round(20 + Math.random() * 10);
      setPlayerHp((h) => {
        const nextHp = Math.max(0, h - penalty);
        if (nextHp <= 0) {
          addLog(`CRITICAL DAMAGE: Core shields completely collapsed.`);
          playFailureBeep();
          setTimeout(() => handleGameOver(score), 10);
        }
        return nextHp;
      });
      playFailureBeep();
      addLog(`SHIELD FAILURE: Core shockwave deflected! -${penalty} HP.`);
    }
  };

  // HP death listener
  useEffect(() => {
    if (gameState === 'playing' && playerHp <= 0) {
      handleGameOver(score);
    }
  }, [playerHp, gameState]);

  const triggerAchievements = async (id: string) => {
    if (!user) return;
    try {
      await unlockAchievement(user.uid, id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGameOver = (finalScore: number) => {
    setGameState('gameover');
    setTargetIndicator((t) => ({ ...t, active: false }));
    playFailureBeep();

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem(`gameverse_terminal_hs_${game.id}`, finalScore.toString());
      onShowNotification('New Personal High Score! 🏆', `Awesome! You recorded ${finalScore} points on "${game.title}"!`, 'success');
    } else {
      onShowNotification('Simulation Ended 🔌', `Your final score is ${finalScore}. Submit your telemetry score to compare!`, 'info');
    }
  };

  const handleScoreSubmit = async () => {
    if (scoreSubmitted || !user) return;
    setScoreSubmitted(true);

    try {
      await submitScore({
        gameId: game.id,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        score: score,
        achievementsCount: score >= 1000 ? 1 : 0,
      });

      onShowNotification('Telemetry Registered! 📡', `Score of ${score} posted to "${game.title}" leaderboard.`, 'success');
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

      {/* Primary Simulator Console Screen */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="text-center w-full">
          <h2 className="text-sm font-black tracking-widest text-emerald-400 flex items-center justify-center gap-2 uppercase">
            <Gamepad className="animate-pulse" size={14} />
            {game.title} (CYBER DECK)
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase mt-0.5">
            Active category deck: {game.category} • HD Rasterizer Ready
          </p>
        </div>

        {/* Display screen */}
        <div className="relative w-full aspect-video sm:aspect-[16/10] bg-black border border-zinc-900 rounded-xl overflow-hidden p-5 flex flex-col justify-between">
          {/* Scanlines Effect */}
          <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35 pointer-events-none" />

          {gameState === 'idle' && (
            <div className="my-auto text-center flex flex-col items-center gap-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Terminal size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-zinc-300 font-bold uppercase tracking-wider text-xs">READY FOR CONNECTION</h3>
                <p className="text-[9px] text-zinc-500 max-w-sm mx-auto mt-1 leading-normal">
                  {game.description}
                </p>
              </div>
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase rounded-lg border border-emerald-400 hover:border-emerald-500 cursor-pointer transition active:scale-95 shadow-md shadow-emerald-500/10"
              >
                CONNECT SIMULATOR DECK
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn">
              {/* Header Telemetry Status Bar */}
              <div className="grid grid-cols-3 gap-2 border-b border-zinc-900 pb-3 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Shield size={10} className="text-rose-400" />
                  <span>Integrity: <span className={playerHp <= 30 ? 'text-rose-500 font-black animate-pulse' : 'text-zinc-200'}>{playerHp}%</span></span>
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <Zap size={10} className="text-yellow-400" />
                  <span>Energy: <span className="text-zinc-200">{energy} / 100</span></span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Cpu size={10} className="text-sky-400" />
                  <span>Score: <span className="text-emerald-400 font-bold">{score}</span></span>
                </div>
              </div>

              {/* Dynamic Console Story Prompt */}
              <div className="my-auto py-4 flex flex-col gap-4 text-left">
                <div className="text-zinc-300 leading-relaxed font-mono text-xs border-l-2 border-emerald-500 pl-3">
                  {activePrompt}
                </div>

                {/* Timing Bar HUD (For Reflex Combat Actions) */}
                {targetIndicator.active && (
                  <div className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex flex-col gap-2 mt-2">
                    <div className="flex justify-between text-[8px] text-zinc-500 tracking-wider">
                      <span>ALIGNMENT ARRAY [L/R SPEED: {speedMultiplier.toFixed(1)}x]</span>
                      <span className="text-emerald-400">ZONE WIDTH: {targetIndicator.size}%</span>
                    </div>

                    <div className="relative h-6 bg-black border border-zinc-900 rounded-lg overflow-hidden">
                      {/* Sweet Green target Zone */}
                      <div
                        className="absolute h-full bg-emerald-500/20 border-l border-r border-emerald-500/40"
                        style={{
                          left: `${targetIndicator.position - targetIndicator.size / 2}%`,
                          width: `${targetIndicator.size}%`,
                        }}
                      />

                      {/* Sweet Perfect Center indicator */}
                      <div
                        className="absolute h-full w-1 bg-emerald-400 opacity-60"
                        style={{ left: `${targetIndicator.position}%` }}
                      />

                      {/* Active Laser Tracker */}
                      <div
                        className="absolute top-0 h-full w-2 bg-gradient-to-r from-sky-400 to-blue-500 shadow-md shadow-sky-400"
                        style={{ left: `${laserPosition}%`, transform: 'translateX(-50%)' }}
                      />
                    </div>

                    <button
                      onClick={handleTimingClick}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white font-bold text-xs uppercase rounded-lg cursor-pointer active:scale-95 transition"
                    >
                      ⚡ FIRE STRIKE DEFLECTOR ⚡
                    </button>
                  </div>
                )}

                {/* RPG Option Buttons */}
                {!targetIndicator.active && (
                  <div className="flex flex-col gap-2 mt-2">
                    {promptOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={opt.action}
                        className="w-full text-left p-2.5 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-750 text-zinc-200 hover:text-white rounded-lg transition-all flex justify-between items-center group cursor-pointer"
                      >
                        <span className="truncate">{opt.label}</span>
                        <ChevronRight size={12} className="text-zinc-550 group-hover:text-emerald-400 shrink-0 transition" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Console Integrity visual warning */}
              {playerHp <= 30 && (
                <div className="absolute inset-x-0 bottom-12 bg-rose-600/10 border-y border-rose-500/20 text-rose-400 py-1 text-center font-bold text-[9px] uppercase tracking-widest animate-pulse">
                  ⚠️ Core Integrity compromised! Shield deflection collapse imminent!
                </div>
              )}
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="my-auto text-center flex flex-col items-center gap-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Trophy size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-rose-400 font-bold uppercase tracking-widest text-xs">SIMULATION TERMINATED</h3>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase font-mono">
                  Final Decrypted Score: <span className="text-emerald-400 font-black text-sm">{score}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center">
                <button
                  onClick={startGame}
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-lg text-[10px] font-bold uppercase border border-zinc-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={11} /> REBOOT MATRIX
                </button>

                {user && (
                  <button
                    onClick={handleScoreSubmit}
                    disabled={scoreSubmitted}
                    className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase border transition flex items-center gap-1.5 cursor-pointer ${
                      scoreSubmitted
                        ? 'bg-zinc-950 border-zinc-900 text-zinc-650 cursor-not-allowed'
                        : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-black hover:border-emerald-500'
                    }`}
                  >
                    📡 {scoreSubmitted ? 'SCORE TRANSMITTED' : 'TRANSMIT SCORES'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cyber Console System Log Output Panel */}
      <div className="w-full md:w-64 flex flex-col border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-6 text-left">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase text-[10px]">
            <Terminal size={12} className="text-emerald-400" />
            <span>Telemetry Register Logs</span>
          </div>
          <span className="text-[8px] font-mono text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-850">
            BUFFER_OK
          </span>
        </div>

        {/* Real-time Logger Stream box */}
        <div className="flex-1 bg-black border border-zinc-900 rounded-xl p-3 font-mono text-[9px] leading-relaxed text-zinc-400 min-h-[140px] max-h-[300px] md:max-h-none overflow-y-auto flex flex-col gap-1.5">
          {systemLogs.length === 0 ? (
            <div className="text-zinc-600 italic">No telemetry data recorded. Boot simulator deck to align diagnostics.</div>
          ) : (
            systemLogs.map((log, idx) => {
              let textClass = 'text-zinc-400';
              if (log.includes('SUCCESS') || log.includes('DEFEATED')) textClass = 'text-emerald-400 font-bold';
              else if (log.includes('ALERT') || log.includes('ERROR') || log.includes('ALERT:')) textClass = 'text-rose-400';
              else if (log.includes('INIT') || log.includes('SYS:')) textClass = 'text-sky-400';

              return (
                <div key={idx} className={`${textClass} break-all`}>
                  {log}
                </div>
              );
            })
          )}
        </div>

        {/* Status Footing widget */}
        <div className="mt-4 pt-3 border-t border-zinc-900/50 flex flex-col gap-1.5 text-[9px] text-zinc-550 font-mono">
          <div className="flex justify-between">
            <span>HIGH TELEMETRY RECORD:</span>
            <span className="text-zinc-300">{highScore} pts</span>
          </div>
          <div className="flex justify-between">
            <span>PILOT STATUS:</span>
            <span className={user ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
              {user ? user.displayName.toUpperCase() : 'ANONYMOUS RECRUIT'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
