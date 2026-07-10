/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle, Lock, Gamepad, Award, Shield } from 'lucide-react';
import { ALL_ACHIEVEMENTS } from '../data/initialData';
import { getUnlockedAchievements } from '../lib/dbHelper';
import { UserProfile } from '../types';

interface AchievementsProps {
  user: UserProfile | null;
}

export default function Achievements({ user }: AchievementsProps) {
  const [unlockedList, setUnlockedList] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnlockedList([]);
      return;
    }

    const fetchUnlocked = async () => {
      setLoading(true);
      try {
        const list = await getUnlockedAchievements(user.uid);
        setUnlockedList(list);
      } catch (err) {
        console.error('Failed to get achievements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUnlocked();
  }, [user]);

  // Calculations
  const totalCount = ALL_ACHIEVEMENTS.length;
  const unlockedCount = unlockedList.length;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const totalPoints = ALL_ACHIEVEMENTS.reduce((sum, ach) => sum + ach.points, 0);
  const earnedPoints = ALL_ACHIEVEMENTS.filter((ach) => unlockedList.includes(ach.id)).reduce(
    (sum, ach) => sum + ach.points,
    0
  );

  const filteredAchievements = ALL_ACHIEVEMENTS.filter((ach) => {
    const isUnlocked = unlockedList.includes(ach.id);
    if (activeFilter === 'unlocked') return isUnlocked;
    if (activeFilter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10 text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
            <Trophy className="text-purple-500 w-8 h-8 animate-bounce" />
            GAMEVERSE ACHIEVEMENT BADGES
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Earn experience score badges across retro channels</p>
        </header>

        {/* User stats overlay */}
        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-zinc-950 border border-zinc-900 p-6 rounded-2xl text-left font-mono">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">UNLOCKED STAGE</div>
              <div className="text-3xl font-black text-purple-400 mt-1">
                {unlockedCount} <span className="text-sm font-normal text-zinc-500">/ {totalCount}</span>
              </div>
              <div className="w-full bg-zinc-900 h-2 rounded-full mt-3 overflow-hidden border border-zinc-850">
                <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${percentage}%` }} />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-zinc-500 uppercase">ACHIEVEMENT POINTS</div>
              <div className="text-3xl font-black text-yellow-500 mt-1">
                {earnedPoints} <span className="text-sm font-normal text-zinc-500">/ {totalPoints} PTS</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-3">Points boost your player card level dynamically.</p>
            </div>

            <div>
              <div className="text-[10px] text-zinc-500 uppercase">PLAYER RANK STATUS</div>
              <div className="text-2xl font-black text-zinc-150 mt-1">{user.rank || 'Bronze Recruit'}</div>
              <p className="text-[10px] text-zinc-500 mt-2">Continue playing to unlock high tier badges.</p>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-2xl text-center text-xs font-mono text-zinc-500 mb-8 leading-relaxed">
            ⚠️ Login using Google or email to track your achievements progress in real-time, earn gamer experience points, and unlock ranking titles!
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex gap-2 mb-8 bg-zinc-950/40 p-2 border border-zinc-900 rounded-2xl justify-start">
          {['all', 'unlocked', 'locked'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f as any)}
              className={`py-2.5 px-5 rounded-xl font-bold tracking-wide text-xs font-mono transition uppercase cursor-pointer ${
                activeFilter === f
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400'
              }`}
            >
              {f === 'all' ? 'All Badges' : f === 'unlocked' ? 'Unlocked' : 'Classified'}
            </button>
          ))}
        </div>

        {/* List of achievements */}
        {loading ? (
          <div className="text-center py-12 text-zinc-650 font-mono text-xs">
            READING HARDWARE BADGE ARRAYS...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12 text-left">
            {filteredAchievements.map((ach) => {
              const isUnlocked = unlockedList.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`border rounded-2xl p-5 flex gap-4 items-center transition relative overflow-hidden ${
                    isUnlocked
                      ? 'bg-zinc-950 border-purple-500/20 shadow-lg shadow-purple-500/[0.02]'
                      : 'bg-zinc-950/40 border-zinc-900/60 opacity-60'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-xl border shrink-0 ${
                      isUnlocked
                        ? 'bg-purple-950/25 border-purple-500/30 text-purple-400 shadow-inner'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-600'
                    }`}
                  >
                    {isUnlocked ? <Award size={24} /> : <Lock size={24} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className={`font-bold text-sm ${isUnlocked ? 'text-zinc-150' : 'text-zinc-500'}`}>
                        {ach.title}
                      </h3>
                      <span className="shrink-0 font-mono text-[9px] font-bold text-yellow-500">
                        +{ach.points} PTS
                      </span>
                    </div>
                    <p className="text-xs text-zinc-550 mt-1 leading-relaxed font-mono">
                      {ach.description}
                    </p>
                    {ach.gameId && (
                      <span className="inline-block px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 text-zinc-550 text-[8px] font-mono font-semibold rounded mt-2 uppercase">
                        🎮 MODULE: {ach.gameId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
