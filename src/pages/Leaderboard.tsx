/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Gamepad2, Calendar, Crown, Medal, User } from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../lib/dbHelper';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'space-shooter' | 'cyber-runner' | 'minesweeper' | 'memory-matrix'>(
    'space-shooter'
  );
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      const list = await getLeaderboard(activeTab, 25);
      setScores(list);
      setLoading(false);
    };
    fetchScores();
  }, [activeTab]);

  const games = [
    { id: 'space-shooter', label: 'Neon Odyssey' },
    { id: 'cyber-runner', label: 'GridRunner 2099' },
    { id: 'minesweeper', label: 'Data Crack' },
    { id: 'memory-matrix', label: 'Neural Matcher' },
  ];

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10 text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/10 via-amber-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
            <Trophy className="text-yellow-500 w-8 h-8 animate-pulse" />
            GLOBAL SCOREBOARDS
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Climb vector rank indexes &amp; verify system scores</p>
        </header>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-2 mb-8 bg-zinc-950/40 p-2 border border-zinc-900 rounded-2xl">
          {games.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveTab(g.id as any)}
              className={`flex-1 py-3 px-4 rounded-xl font-bold tracking-wide text-xs font-mono transition uppercase cursor-pointer ${
                activeTab === g.id
                  ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/20'
                  : 'bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Score Table */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-zinc-650 font-mono text-xs">
              SYNCHRONIZING SCOREBOARDS CELL DATA...
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-24 px-6">
              <Crown className="text-zinc-600 w-12 h-12 mx-auto mb-4" />
              <h3 className="font-bold text-base text-zinc-400 font-mono">SCOREBOARD IS CURRENTLY EMPTY</h3>
              <p className="text-xs text-zinc-500 mt-1.5 max-w-sm mx-auto font-mono">
                No telemetry flight logs have been submitted for this game yet. Be the first to secure a score slot!
              </p>
            </div>
          ) : (
            <div className="w-full text-left font-mono text-xs">
              {/* Header */}
              <div className="grid grid-cols-12 bg-zinc-900/30 border-b border-zinc-900 p-4 font-bold text-zinc-500 uppercase tracking-wider">
                <div className="col-span-2 text-center">RANK</div>
                <div className="col-span-6">PLAYER CADET</div>
                <div className="col-span-4 text-right">HIGH SCORE</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col">
                {scores.map((score, idx) => {
                  const rank = idx + 1;
                  let rankIcon = null;
                  let rowStyle = 'hover:bg-zinc-900/10 border-b border-zinc-900/40';

                  if (rank === 1) {
                    rankIcon = <Crown className="text-yellow-500 w-4 h-4 inline" />;
                    rowStyle += ' bg-yellow-950/5';
                  } else if (rank === 2) {
                    rankIcon = <Medal className="text-zinc-300 w-4 h-4 inline" />;
                    rowStyle += ' bg-zinc-900/5';
                  } else if (rank === 3) {
                    rankIcon = <Medal className="text-amber-600 w-4 h-4 inline" />;
                  }

                  return (
                    <div key={score.id} className={`grid grid-cols-12 items-center p-4 transition ${rowStyle}`}>
                      <div className="col-span-2 text-center font-black text-sm text-zinc-400">
                        {rankIcon ? <span className="flex justify-center">{rankIcon}</span> : `#${rank}`}
                      </div>
                      <div className="col-span-6 flex items-center gap-3">
                        <img
                          src={score.userPhoto}
                          alt={score.userName}
                          className="w-8 h-8 rounded-xl border border-zinc-800 object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-250 truncate max-w-[150px] sm:max-w-[240px]">
                            {score.userName}
                          </span>
                          <span className="text-[9px] text-zinc-600 uppercase flex items-center gap-1 mt-0.5">
                            <Calendar size={10} />
                            <span>{new Date(score.createdAt).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                      <div className="col-span-4 text-right font-black text-sm text-yellow-500 tracking-wider">
                        {score.score.toLocaleString()} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
