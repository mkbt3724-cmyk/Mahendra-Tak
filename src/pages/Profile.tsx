/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, ShieldAlert, Award, Star, Trophy, Calendar, Check, Trash2, Heart } from 'lucide-react';
import { UserProfile, LeaderboardEntry } from '../types';
import { getUserProfile, updateUserProfile, deleteUserProfile, getUnlockedAchievements, getUserScoreLogs } from '../lib/dbHelper';
import { ALL_ACHIEVEMENTS } from '../data/initialData';

interface ProfileProps {
  user: UserProfile | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  onProfileUpdated: () => void;
}

export default function Profile({
  user,
  onLogout,
  onNavigate,
  onShowNotification,
  onProfileUpdated,
}: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [motto, setMotto] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [scoreHistory, setScoreHistory] = useState<LeaderboardEntry[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      onNavigate('home');
      return;
    }

    const loadProfileData = async () => {
      setLoading(true);
      const prof = await getUserProfile(user.uid);
      if (prof) {
        setProfile(prof);
        setMotto(prof.motto || '');
      }

      const achs = await getUnlockedAchievements(user.uid);
      setUnlockedAchievements(achs);

      const logs = await getUserScoreLogs(user.uid);
      setScoreHistory(logs);

      setLoading(false);
    };

    loadProfileData();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    try {
      await updateUserProfile(user.uid, { motto: motto.trim() });
      onShowNotification('Motto Synchronized! 💾', 'Your customized gamer biography has been saved on network nodes.', 'success');
      onProfileUpdated();

      // Refresh
      const prof = await getUserProfile(user.uid);
      if (prof) setProfile(prof);
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await deleteUserProfile(user.uid);
      onShowNotification('Account Purged! 💣', 'Your player profile, score historical entries, and achievements have been deleted from servers.', 'info');
      onLogout();
      onNavigate('home');
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  if (loading || !profile) {
    return (
      <div className="w-full flex-1 flex items-center justify-center bg-black py-24 text-zinc-500 font-mono text-xs">
        <span>INTERCEPTING PILOT DECRYPTION CORES...</span>
      </div>
    );
  }

  // Calculate stats
  const unlockedCount = unlockedAchievements.length;
  const pointsEarned = ALL_ACHIEVEMENTS.filter((a) => unlockedAchievements.includes(a.id)).reduce(
    (sum, a) => sum + a.points,
    0
  );

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-4xl mx-auto w-full text-left">
        {/* Header */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10 text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
            <User className="text-blue-500 w-8 h-8" />
            MY PLAYER PROFILE
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Synchronize avatar nodes &amp; audit scorecard matrixes</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          {/* Main profile spec updates */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Biography Profile Form */}
            <form onSubmit={handleUpdate} className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
              <h2 className="text-sm font-bold tracking-widest text-zinc-400 font-mono uppercase mb-5">
                IDENTITY DECRYPTER
              </h2>

              <div className="flex flex-col sm:flex-row gap-6 items-center mb-6">
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-20 h-20 rounded-2xl border-2 border-blue-500/20 object-cover shrink-0"
                />
                <div className="flex-1 min-w-0 font-mono text-left">
                  <div className="text-lg font-bold text-zinc-150 truncate">{profile.displayName}</div>
                  <div className="text-xs text-zinc-550 truncate mt-0.5">{profile.email}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] font-bold uppercase">
                      RANK: {profile.rank || 'Bronze Recruit'}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-850 rounded text-[9px] font-bold uppercase">
                      ROLE: {profile.role || 'user'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Update Biography Motto */}
              <div className="flex flex-col gap-2 font-mono">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Custom Motto / Bio Statement</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="Enter customized slogan..."
                    maxLength={100}
                    className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none px-4 py-2 text-xs rounded-xl text-zinc-200"
                  />
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Check size={12} />
                    <span>SAVE</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Score History */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
              <h2 className="text-sm font-bold tracking-widest text-zinc-400 font-mono uppercase mb-5">
                PERSONAL RUN TELEMETRIES
              </h2>

              <div className="flex flex-col gap-2.5 font-mono">
                {scoreHistory.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-650">
                    NO SCORE TELEMETRY ENTRIES STORED YET.
                  </div>
                ) : (
                  scoreHistory.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between items-center p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <Trophy className="text-yellow-500 w-4 h-4" />
                        <div className="text-left">
                          <div className="text-xs font-bold text-zinc-300 uppercase">{log.gameId} Run</div>
                          <div className="text-[9px] text-zinc-600 flex items-center gap-1.5 mt-0.5">
                            <Calendar size={10} />
                            <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-yellow-500">{log.score} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar calculations & Account deletion */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Visual stats summary */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 text-left">
              <h2 className="text-xs font-bold tracking-widest text-zinc-400 font-mono uppercase mb-5">
                CADET ACHIEVEMENTS
              </h2>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-900 text-center">
                  <div className="text-[9px] text-zinc-550 uppercase">Earned Points</div>
                  <div className="text-xl font-bold text-yellow-500 mt-1">{pointsEarned}</div>
                </div>
                <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-900 text-center">
                  <div className="text-[9px] text-zinc-550 uppercase">Badges Unlocked</div>
                  <div className="text-xl font-bold text-purple-400 mt-1">{unlockedCount} / {ALL_ACHIEVEMENTS.length}</div>
                </div>
              </div>
            </div>

            {/* Deletion Form Box */}
            <div className="bg-zinc-950 border border-red-950 rounded-3xl p-6 text-left">
              <h2 className="text-xs font-bold tracking-widest text-red-500 font-mono uppercase flex items-center gap-1 mb-2">
                <ShieldAlert size={14} />
                ACCOUNT REMOVAL PROTOCOL
              </h2>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
                Deleting your player card removes your profile document, locked and unlocked achievements list, and leaderboard scores permanently. This action is irreversible.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-4 px-4 py-2 bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-950/70 rounded-xl text-xs font-bold font-mono transition w-full cursor-pointer"
                >
                  Request Profile Purge
                </button>
              ) : (
                <div className="mt-4 border-t border-red-950/40 pt-4 flex flex-col gap-2">
                  <span className="text-[10px] text-red-500 font-bold font-mono uppercase">CONFIRM DISPOSAL:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer"
                    >
                      Yes, Purge Profile
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-zinc-300 rounded-xl text-xs font-bold font-mono border border-zinc-850 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
