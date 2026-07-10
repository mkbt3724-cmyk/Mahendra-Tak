/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Target, Award, RotateCcw, Play, RefreshCw, Volume2, VolumeX, Eye } from 'lucide-react';
import { UserProfile } from '../../types';
import { submitScore, unlockAchievement } from '../../lib/dbHelper';

interface CyberBattleshipProps {
  user: UserProfile | null;
  onScoreSubmitted: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  graphicsQuality?: 'sd' | '1080p' | '4k';
}

type CellState = 'empty' | 'ship' | 'miss' | 'hit';

interface ShipType {
  id: string;
  name: string;
  size: number;
  color: string;
}

const SHIP_TYPES: ShipType[] = [
  { id: 'carrier', name: 'Carrier', size: 5, color: 'bg-emerald-500 border-emerald-400' },
  { id: 'battleship', name: 'Battleship', size: 4, color: 'bg-purple-500 border-purple-400' },
  { id: 'destroyer', name: 'Destroyer', size: 3, color: 'bg-blue-500 border-blue-400' },
  { id: 'submarine', name: 'Submarine', size: 3, color: 'bg-cyan-500 border-cyan-400' },
  { id: 'patrol', name: 'Patrol Boat', size: 2, color: 'bg-amber-500 border-amber-400' },
];

interface PlacedShip {
  shipId: string;
  coords: { r: number; c: number }[];
  hits: number;
}

export default function CyberBattleship({
  user,
  onScoreSubmitted,
  onShowNotification,
  graphicsQuality = '1080p',
}: CyberBattleshipProps) {
  // Game States: 'setup' | 'playing' | 'gameover'
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'gameover'>('setup');
  const [playerGrid, setPlayerGrid] = useState<CellState[][]>(Array(10).fill(null).map(() => Array(10).fill('empty')));
  const [opponentGrid, setOpponentGrid] = useState<CellState[][]>(Array(10).fill(null).map(() => Array(10).fill('empty')));
  const [opponentVisibleGrid, setOpponentVisibleGrid] = useState<CellState[][]>(Array(10).fill(null).map(() => Array(10).fill('empty')));

  // Placement parameters
  const [selectedShipIndex, setSelectedShipIndex] = useState<number>(0);
  const [isHorizontal, setIsHorizontal] = useState<boolean>(true);
  const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);
  const [opponentShips, setOpponentShips] = useState<PlacedShip[]>([]);

  // Hover indicator for placement
  const [hoverCoords, setHoverCoords] = useState<{ r: number; c: number } | null>(null);

  // Stats
  const [playerTurn, setPlayerTurn] = useState<boolean>(true);
  const [shotsFired, setShotsFired] = useState<number>(0);
  const [hitsSucceeded, setHitsSucceeded] = useState<number>(0);
  const [gameLog, setGameLog] = useState<string[]>(['Grid Armada online. Ready for deployment.']);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [winner, setWinner] = useState<'player' | 'cpu' | null>(null);
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);

  // AI Target hunting states
  const [aiTargetQueue, setAiTargetQueue] = useState<{ r: number; c: number }[]>([]);

  // Synth sound generator
  const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignored audio context blocks
    }
  };

  // Helper: auto-generate AI ships placing them randomly without collisions
  const generateCpuShips = (): { grid: CellState[][]; ships: PlacedShip[] } => {
    const grid: CellState[][] = Array(10).fill(null).map(() => Array(10).fill('empty'));
    const ships: PlacedShip[] = [];

    SHIP_TYPES.forEach((ship) => {
      let placed = false;
      while (!placed) {
        const isH = Math.random() > 0.5;
        const r = Math.floor(Math.random() * (isH ? 10 : 10 - ship.size + 1));
        const c = Math.floor(Math.random() * (isH ? 10 - ship.size + 1 : 10));

        // Check path clear
        let valid = true;
        const coords: { r: number; c: number }[] = [];
        for (let i = 0; i < ship.size; i++) {
          const currR = isH ? r : r + i;
          const currC = isH ? c + i : c;
          if (grid[currR][currC] !== 'empty') {
            valid = false;
            break;
          }
          coords.push({ r: currR, c: currC });
        }

        if (valid) {
          coords.forEach(({ r: currR, c: currC }) => {
            grid[currR][currC] = 'ship';
          });
          ships.push({
            shipId: ship.id,
            coords,
            hits: 0,
          });
          placed = true;
        }
      }
    });

    return { grid, ships };
  };

  // Quick Auto Deploy for Player
  const handleAutoDeploy = () => {
    const grid: CellState[][] = Array(10).fill(null).map(() => Array(10).fill('empty'));
    const ships: PlacedShip[] = [];

    SHIP_TYPES.forEach((ship) => {
      let placed = false;
      while (!placed) {
        const isH = Math.random() > 0.5;
        const r = Math.floor(Math.random() * (isH ? 10 : 10 - ship.size + 1));
        const c = Math.floor(Math.random() * (isH ? 10 - ship.size + 1 : 10));

        let valid = true;
        const coords: { r: number; c: number }[] = [];
        for (let i = 0; i < ship.size; i++) {
          const currR = isH ? r : r + i;
          const currC = isH ? c + i : c;
          if (grid[currR][currC] !== 'empty') {
            valid = false;
            break;
          }
          coords.push({ r: currR, c: currC });
        }

        if (valid) {
          coords.forEach(({ r: currR, c: currC }) => {
            grid[currR][currC] = 'ship';
          });
          ships.push({
            shipId: ship.id,
            coords,
            hits: 0,
          });
          placed = true;
        }
      }
    });

    setPlayerGrid(grid);
    setPlacedShips(ships);
    setSelectedShipIndex(SHIP_TYPES.length); // All placed
    playSound(440, 0.2);
    onShowNotification('Fleet Configured! 🛡️', 'All system interceptors deployed onto tactical matrices.', 'success');
    addLog('Fleet automatically configured.');
  };

  const handleResetSetup = () => {
    setPlayerGrid(Array(10).fill(null).map(() => Array(10).fill('empty')));
    setPlacedShips([]);
    setSelectedShipIndex(0);
    setGameState('setup');
    setWinner(null);
    setScoreSubmitted(false);
    setShotsFired(0);
    setHitsSucceeded(0);
    setAiTargetQueue([]);
    setGameLog(['Grid Armada online. Deploy your fleet.']);
    playSound(200, 0.3);
  };

  // Place ship manually
  const handleCellClickSetup = (r: number, c: number) => {
    if (selectedShipIndex >= SHIP_TYPES.length) return;
    const ship = SHIP_TYPES[selectedShipIndex];

    // Check validity
    let valid = true;
    const coords: { r: number; c: number }[] = [];
    for (let i = 0; i < ship.size; i++) {
      const currR = isHorizontal ? r : r + i;
      const currC = isHorizontal ? c + i : c;

      if (currR < 0 || currR >= 10 || currC < 0 || currC >= 10) {
        valid = false;
        break;
      }
      if (playerGrid[currR][currC] !== 'empty') {
        valid = false;
        break;
      }
      coords.push({ r: currR, c: currC });
    }

    if (!valid) {
      playSound(150, 0.15, 'sawtooth');
      return;
    }

    // Place
    const nextGrid = playerGrid.map((row) => [...row]);
    coords.forEach(({ r: currR, c: currC }) => {
      nextGrid[currR][currC] = 'ship';
    });

    setPlayerGrid(nextGrid);
    setPlacedShips([...placedShips, { shipId: ship.id, coords, hits: 0 }]);
    setSelectedShipIndex(selectedShipIndex + 1);
    playSound(600 + selectedShipIndex * 100, 0.1);
    addLog(`Deployed ${ship.name} size ${ship.size}.`);
  };

  // Launch Battle
  const handleLaunchBattle = () => {
    if (placedShips.length < SHIP_TYPES.length) return;

    // Generate opponent layout
    const cpu = generateCpuShips();
    setOpponentGrid(cpu.grid);
    setOpponentShips(cpu.ships);
    setOpponentVisibleGrid(Array(10).fill(null).map(() => Array(10).fill('empty')));

    setGameState('playing');
    setPlayerTurn(true);
    playSound(800, 0.4);
    playSound(1000, 0.2);
    onShowNotification('Engaging Combat! 🎯', 'Firing lines open. Fire probes on the opponent grid.', 'info');
    addLog('System conflict initiated. Tactical targeting engaged.');
  };

  const addLog = (msg: string) => {
    setGameLog((prev) => [msg, ...prev.slice(0, 19)]);
  };

  // Attack AI Cell
  const handleAttackOpponent = (r: number, c: number) => {
    if (!playerTurn || gameState !== 'playing') return;
    if (opponentVisibleGrid[r][c] !== 'empty') return; // already hit

    setShotsFired((prev) => prev + 1);
    const cellValue = opponentGrid[r][c];
    const nextVisible = opponentVisibleGrid.map((row) => [...row]);

    if (cellValue === 'ship') {
      nextVisible[r][c] = 'hit';
      setHitsSucceeded((prev) => prev + 1);
      playSound(400, 0.15, 'sawtooth');
      playSound(200, 0.1, 'triangle');
      addLog(`Target locked! HIT at [${String.fromCharCode(65 + r)}${c + 1}]`);

      // Update hit state on the ship
      const nextOppShips = opponentShips.map((s) => {
        const matched = s.coords.some((co) => co.r === r && co.c === c);
        if (matched) {
          const nextHits = s.hits + 1;
          const shipInfo = SHIP_TYPES.find((sh) => sh.id === s.shipId);
          if (nextHits >= (shipInfo?.size || 0)) {
            addLog(`⚡ CPU\'s ${shipInfo?.name || 'Vessel'} has been DECAPITATED / SUNK!`);
            onShowNotification('Target Destroyed! 💥', `You sunk the enemy's ${shipInfo?.name}!`, 'success');
          }
          return { ...s, hits: nextHits };
        }
        return s;
      });
      setOpponentShips(nextOppShips);
      setOpponentVisibleGrid(nextVisible);

      // Check game over (17 total hits)
      const totalHitsNeeded = SHIP_TYPES.reduce((acc, s) => acc + s.size, 0);
      const isCpuDead = nextOppShips.every((s) => {
        const size = SHIP_TYPES.find((st) => st.id === s.shipId)?.size || 0;
        return s.hits >= size;
      });

      if (isCpuDead) {
        setGameState('gameover');
        setWinner('player');
        playSound(900, 0.6);
        addLog('🏆 VICTORY! Enemy database fleets neutralized!');
        onShowNotification('VICTORY ACQUIRED! 🏆', 'You completely wiped out the CPU fleet!', 'success');
        triggerAchievements('win-battleship');
        return;
      }
    } else {
      nextVisible[r][c] = 'miss';
      playSound(120, 0.2);
      addLog(`Strike missed at [${String.fromCharCode(65 + r)}${c + 1}]`);
      setOpponentVisibleGrid(nextVisible);
    }

    // Switch to AI turn
    setPlayerTurn(false);
  };

  // Run AI move inside useEffect when playerTurn becomes false
  useEffect(() => {
    if (playerTurn || gameState !== 'playing') return;

    const timer = setTimeout(() => {
      executeCpuAttack();
    }, 700);

    return () => clearTimeout(timer);
  }, [playerTurn, gameState]);

  // AI Attack logic
  const executeCpuAttack = () => {
    let r = 0;
    let c = 0;
    let targetSelected = false;

    // Smart AI logic: if there are targets in queue, shoot them
    const validTargets = aiTargetQueue.filter(
      (coord) => playerGrid[coord.r][coord.c] === 'empty' || playerGrid[coord.r][coord.c] === 'ship'
    );

    if (validTargets.length > 0) {
      const target = validTargets[0];
      r = target.r;
      c = target.c;
      setAiTargetQueue(validTargets.slice(1));
      targetSelected = true;
    } else {
      // Find candidate coordinates near hits
      // Find hits that belong to non-sunk ships if possible, otherwise random hunt
      let huntSuccess = false;
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (playerGrid[i][j] === 'hit') {
            // Check adjacent unhit cells
            const adjacents = [
              { r: i - 1, c: j },
              { r: i + 1, c: j },
              { r: i, c: j - 1 },
              { r: i, c: j + 1 },
            ].filter((co) => co.r >= 0 && co.r < 10 && co.c >= 0 && co.c < 10);

            const unhitAdj = adjacents.filter((co) => playerGrid[co.r][co.c] === 'empty' || playerGrid[co.r][co.c] === 'ship');
            if (unhitAdj.length > 0) {
              const selected = unhitAdj[Math.floor(Math.random() * unhitAdj.length)];
              r = selected.r;
              c = selected.c;
              // Queue other alternatives
              const remaining = unhitAdj.filter((co) => co.r !== r || co.c !== c);
              setAiTargetQueue((prev) => [...prev, ...remaining]);
              targetSelected = true;
              huntSuccess = true;
              break;
            }
          }
        }
        if (huntSuccess) break;
      }
    }

    // Fallback to random shot
    if (!targetSelected) {
      const candidates: { r: number; c: number }[] = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (playerGrid[i][j] === 'empty' || playerGrid[i][j] === 'ship') {
            candidates.push({ r: i, c: j });
          }
        }
      }

      if (candidates.length === 0) return; // Grid fully resolved
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      r = pick.r;
      c = pick.c;
    }

    // Execute shot
    const cellValue = playerGrid[r][c];
    const nextGrid = playerGrid.map((row) => [...row]);

    if (cellValue === 'ship') {
      nextGrid[r][c] = 'hit';
      playSound(300, 0.25, 'sawtooth');
      addLog(`⚠️ System Breach! CPU HIT your vessel at [${String.fromCharCode(65 + r)}${c + 1}]`);

      // Update player ship healths
      const nextPlacedShips = placedShips.map((s) => {
        const matched = s.coords.some((co) => co.r === r && co.c === c);
        if (matched) {
          const nextHits = s.hits + 1;
          const shipInfo = SHIP_TYPES.find((sh) => sh.id === s.shipId);
          if (nextHits >= (shipInfo?.size || 0)) {
            addLog(`🚨 Critical! Your ${shipInfo?.name || 'Vessel'} is SUNK!`);
            onShowNotification('Vessel Compromised! 🚨', `CPU sunk your ${shipInfo?.name}!`, 'info');
          }
          return { ...s, hits: nextHits };
        }
        return s;
      });
      setPlacedShips(nextPlacedShips);
      setPlayerGrid(nextGrid);

      // Check if Player is dead
      const isPlayerDead = nextPlacedShips.every((s) => {
        const size = SHIP_TYPES.find((st) => st.id === s.shipId)?.size || 0;
        return s.hits >= size;
      });

      if (isPlayerDead) {
        setGameState('gameover');
        setWinner('cpu');
        playSound(180, 0.8, 'sawtooth');
        addLog('💀 DEFEAT! All infrastructure units wiped out.');
        onShowNotification('Grid Overrun! 💀', 'CPU successfully eliminated all your naval security lines.', 'info');
        return;
      }
    } else {
      nextGrid[r][c] = 'miss';
      playSound(150, 0.15);
      addLog(`CPU targeted [${String.fromCharCode(65 + r)}${c + 1}] - MISSED`);
      setPlayerGrid(nextGrid);
    }

    setPlayerTurn(true);
  };

  // Unlock Achievements helper
  const triggerAchievements = async (id: string) => {
    if (!user) return;
    try {
      const unlocked = await unlockAchievement(user.uid, id);
      if (unlocked) {
        onShowNotification('Achievement Unlocked! 🏆', `Completed milestone: ${id === 'win-battleship' ? 'Grand Admiral' : 'Data Cadet'}`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit final score
  const handleScoreSubmit = async () => {
    if (scoreSubmitted || !user) return;
    setScoreSubmitted(true);

    // Calculate score based on turns/accuracy/ships saved
    const accuracy = shotsFired > 0 ? Math.round((hitsSucceeded / shotsFired) * 100) : 0;
    const survivors = placedShips.filter((s) => {
      const size = SHIP_TYPES.find((st) => st.id === s.shipId)?.size || 0;
      return s.hits < size;
    }).length;

    // Score formulas
    const baseScore = winner === 'player' ? 3000 : 500;
    const accuracyBonus = accuracy * 25;
    const survivorsBonus = survivors * 400;
    const finalScore = Math.max(100, baseScore + accuracyBonus + survivorsBonus - (shotsFired * 15));

    try {
      await submitScore({
        gameId: 'battleship',
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        score: finalScore,
        achievementsCount: 0,
      });

      onShowNotification('Score Registered! 🚀', `High score of ${finalScore} uploaded into global arrays!`, 'success');
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
          <h2 className="text-sm font-black tracking-widest text-blue-400 flex items-center justify-center gap-2 uppercase">
            <Shield className="animate-pulse" size={14} />
            GRID ARMADA SECURITY ZONE
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Turn-based naval decryption grid simulation</p>
        </div>

        {gameState === 'setup' && (
          <div className="w-full flex flex-col items-center gap-4">
            {/* Deploy Helper bar */}
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-xl p-3.5 w-full flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-left">
                {selectedShipIndex < SHIP_TYPES.length ? (
                  <>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">CURRENT VESSEL IN DOCK</div>
                    <div className="text-xs font-black text-white uppercase flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                      {SHIP_TYPES[selectedShipIndex].name} (Size: {SHIP_TYPES[selectedShipIndex].size})
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] text-emerald-500 uppercase font-bold">READY TO COMMENCE</div>
                    <div className="text-xs font-black text-white uppercase mt-0.5">Fleet fully positioned!</div>
                  </>
                )}
              </div>

              {selectedShipIndex < SHIP_TYPES.length && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsHorizontal(!isHorizontal)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg border border-zinc-750 cursor-pointer text-[10px]"
                  >
                    ROTATE: {isHorizontal ? 'HORIZONTAL' : 'VERTICAL'}
                  </button>
                  <button
                    onClick={handleAutoDeploy}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold rounded-lg border border-blue-500/30 cursor-pointer text-[10px]"
                  >
                    AUTO-DEPLOY
                  </button>
                </div>
              )}
            </div>

            {/* Placement Grid */}
            <div className="flex flex-col items-center">
              <div className="text-[9px] text-zinc-550 uppercase mb-2">POSITION SHIPS IN THE DEPLOYMENT MATRIX</div>
              <div className="grid grid-cols-10 gap-1 bg-black p-2 rounded-2xl border border-zinc-900 select-none">
                {playerGrid.map((row, r) =>
                  row.map((cell, c) => {
                    const isShip = cell === 'ship';
                    // Determine if coordinate is highlighted in hover placement preview
                    let isHovered = false;
                    if (hoverCoords && selectedShipIndex < SHIP_TYPES.length) {
                      const ship = SHIP_TYPES[selectedShipIndex];
                      for (let i = 0; i < ship.size; i++) {
                        const previewR = isHorizontal ? hoverCoords.r : hoverCoords.r + i;
                        const previewC = isHorizontal ? hoverCoords.c + i : hoverCoords.c;
                        if (previewR === r && previewC === c) {
                          isHovered = true;
                        }
                      }
                    }

                    return (
                      <button
                        key={`${r}-${c}`}
                        onMouseEnter={() => setHoverCoords({ r, c })}
                        onMouseLeave={() => setHoverCoords(null)}
                        onClick={() => handleCellClickSetup(r, c)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition duration-100 flex items-center justify-center border text-[9px] font-bold ${
                          isShip
                            ? 'bg-blue-600/30 border-blue-500/80 text-blue-300'
                            : isHovered
                            ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                            : 'bg-zinc-950 border-zinc-900 hover:border-zinc-850'
                        }`}
                      >
                        {isShip && '🚢'}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Launch Action */}
            <div className="flex gap-3">
              <button
                disabled={placedShips.length < SHIP_TYPES.length}
                onClick={handleLaunchBattle}
                className={`px-8 py-3.5 font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-lg ${
                  placedShips.length < SHIP_TYPES.length
                    ? 'bg-zinc-900 border border-zinc-850 text-zinc-600 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/10 active:scale-95'
                }`}
              >
                <Play size={14} />
                <span>LAUNCH TACTICAL CONFLICT</span>
              </button>
              {placedShips.length > 0 && (
                <button
                  onClick={handleResetSetup}
                  className="px-4 py-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 font-bold uppercase rounded-xl transition cursor-pointer"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Game play layout */}
        {gameState === 'playing' && (
          <div className="w-full flex flex-col xl:flex-row gap-6 justify-center items-center">
            {/* Player security fleet grid */}
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-blue-400 font-bold uppercase mb-2 flex items-center gap-1">
                <Shield size={11} /> MY SECTOR INFRASTRUCTURE
              </div>
              <div className="grid grid-cols-10 gap-1 bg-black p-2 rounded-2xl border border-zinc-900 select-none">
                {playerGrid.map((row, r) =>
                  row.map((cell, c) => {
                    const isHit = cell === 'hit';
                    const isMiss = cell === 'miss';
                    const isShip = cell === 'ship';

                    return (
                      <div
                        key={`p-${r}-${c}`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center text-[9px] font-bold ${
                          isHit
                            ? 'bg-red-950/50 border-red-500/80 text-red-500 animate-pulse'
                            : isMiss
                            ? 'bg-zinc-900/40 border-zinc-800 text-zinc-600'
                            : isShip
                            ? 'bg-blue-950/40 border-blue-800 text-blue-400'
                            : 'bg-zinc-950 border-zinc-900'
                        }`}
                      >
                        {isHit ? '🔥' : isMiss ? '⚪' : isShip ? '🚢' : ''}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Target search network grid */}
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-amber-500 font-bold uppercase mb-2 flex items-center gap-1">
                <Target size={11} className={playerTurn ? 'animate-spin' : ''} />
                {playerTurn ? 'PROBE FIRING RADAR: SELECT CELL' : 'CPU SYSTEM COMPILING RESPONSE...'}
              </div>
              <div className="grid grid-cols-10 gap-1 bg-black p-2 rounded-2xl border border-blue-500/10 select-none">
                {opponentVisibleGrid.map((row, r) =>
                  row.map((cell, c) => {
                    const isHit = cell === 'hit';
                    const isMiss = cell === 'miss';
                    const isAlreadyShot = cell !== 'empty';

                    return (
                      <button
                        key={`o-${r}-${c}`}
                        disabled={!playerTurn || isAlreadyShot}
                        onClick={() => handleAttackOpponent(r, c)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition duration-150 border flex items-center justify-center text-[9px] font-bold ${
                          isHit
                            ? 'bg-red-500/20 border-red-500 text-red-400 font-bold animate-pulse'
                            : isMiss
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-550'
                            : 'bg-zinc-950 border-zinc-900 hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer'
                        }`}
                      >
                        {isHit ? '💥' : isMiss ? '⚪' : ''}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Game Over Panel */}
        {gameState === 'gameover' && (
          <div className="w-full flex flex-col items-center py-6 text-center">
            {winner === 'player' ? (
              <div className="animate-bounce p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 mb-4">
                <Award size={48} />
              </div>
            ) : (
              <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 mb-4">
                <Shield size={48} />
              </div>
            )}

            <h3 className="text-lg font-black uppercase tracking-widest text-white">
              {winner === 'player' ? 'GRID INFRASTRUCTURE SECURED!' : 'GRID ACCESS EXPLOITED / LOST!'}
            </h3>
            <p className="text-zinc-500 text-xs mt-1 uppercase">
              {winner === 'player'
                ? 'All CPU nodes have been offline decapitated.'
                : 'CPU successfully overrode our operational grids.'}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl max-w-lg w-full my-6 text-left font-mono">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase">SHOTS TERMINATED</span>
                <div className="text-sm font-bold text-zinc-150 mt-0.5">{shotsFired}</div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 uppercase">PROBE ACCURACY</span>
                <div className="text-sm font-bold text-zinc-150 mt-0.5">
                  {shotsFired > 0 ? Math.round((hitsSucceeded / shotsFired) * 100) : 0}%
                </div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 uppercase">VESSELS REMAINING</span>
                <div className="text-sm font-bold text-zinc-150 mt-0.5">
                  {placedShips.filter((s) => s.hits < (SHIP_TYPES.find((st) => st.id === s.shipId)?.size || 0)).length} / 5
                </div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-550 uppercase">RATING PERFORMANCE</span>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {winner === 'player' ? 'S+ RANK' : 'F- BOOT'}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {user ? (
                <button
                  onClick={handleScoreSubmit}
                  disabled={scoreSubmitted}
                  className={`px-6 py-3.5 font-bold uppercase rounded-xl transition ${
                    scoreSubmitted
                      ? 'bg-zinc-900 border border-zinc-850 text-zinc-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-600/10 active:scale-95'
                  }`}
                >
                  {scoreSubmitted ? 'SCORE SECURED' : 'SUBMIT HIGH SCORE'}
                </button>
              ) : (
                <span className="text-zinc-500 text-[10px] uppercase font-bold py-2 bg-zinc-900/40 border border-zinc-900 px-4 rounded-xl">
                  Log in to submit highscore arrays
                </span>
              )}

              <button
                onClick={handleResetSetup}
                className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-bold uppercase rounded-xl transition cursor-pointer"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel / Live Log */}
      <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-zinc-900 pt-6 md:pt-0 md:pl-6 flex flex-col gap-5 text-left select-none">
        <div>
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">VESSEL REGISTRY</h4>
          <div className="flex flex-col gap-2 font-mono text-[10px]">
            {SHIP_TYPES.map((type) => {
              const placed = placedShips.find((s) => s.shipId === type.id);
              const sunk = placed && placed.hits >= type.size;
              return (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 border border-zinc-900/50"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${type.color.split(' ')[0]}`} />
                    <span className="font-bold text-zinc-300 uppercase">{type.name}</span>
                  </span>
                  <span className="text-[9px] font-bold">
                    {sunk ? (
                      <span className="text-red-500 font-bold">DECAPITATED</span>
                    ) : placed ? (
                      <span className="text-emerald-500 font-bold">HEALTH: {type.size - placed.hits}/{type.size}</span>
                    ) : (
                      <span className="text-zinc-650">UNPLACED</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[140px]">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">CORE TELEMETRY LOGS</h4>
          <div className="flex-1 bg-black p-3.5 rounded-2xl border border-zinc-900 max-h-[180px] overflow-y-auto flex flex-col gap-1.5 font-mono text-[9px] text-zinc-500">
            {gameLog.map((log, idx) => (
              <div
                key={idx}
                className={`leading-relaxed border-l-2 pl-1.5 ${
                  log.includes('HIT')
                    ? 'border-red-500 text-zinc-300'
                    : log.includes('SUNK') || log.includes('VICTORY')
                    ? 'border-emerald-500 text-zinc-200'
                    : 'border-zinc-800 text-zinc-550'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
