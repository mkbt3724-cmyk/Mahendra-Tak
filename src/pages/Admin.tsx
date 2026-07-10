/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Mail,
  Gamepad,
  Settings,
  Check,
  X,
  Trash2,
  Plus,
  Edit2,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile, Game, Review, ContactMessage } from '../types';
import {
  getGames,
  createGame,
  updateGame,
  deleteGame,
  getPendingReviews,
  approveReview,
  deleteReview,
  getContactMessages,
  deleteContactMessage,
} from '../lib/dbHelper';

interface AdminProps {
  user: UserProfile | null;
  onNavigate: (page: string) => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
}

export default function Admin({ user, onNavigate, onShowNotification }: AdminProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'reviews' | 'inbox' | 'settings'>('overview');
  const [games, setGames] = useState<Game[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  // Maintenance toggle local state
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // New Game Form states
  const [showGameForm, setShowGameForm] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);

  // Form Fields
  const [gameSlug, setGameSlug] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const [gameCategory, setGameCategory] = useState('Shooting');
  const [gameDesc, setGameDesc] = useState('');
  const [gameThumb, setGameThumb] = useState('');
  const [gameDev, setGameDev] = useState('');
  const [gameVersion, setGameVersion] = useState('1.0.0');
  const [gameFeatured, setGameFeatured] = useState(false);

  useEffect(() => {
    // Force redirect non-admins
    if (!user || user.role !== 'admin') {
      onNavigate('home');
      return;
    }

    const loadAdminData = async () => {
      const g = await getGames();
      setGames(g);

      const r = await getPendingReviews();
      setPendingReviews(r);

      const m = await getContactMessages();
      setMessages(m);

      // Read simulated maintenance setting from localstorage
      const isMaint = localStorage.getItem('gameverse_maintenance_mode') === 'true';
      setMaintenanceMode(isMaint);
    };

    loadAdminData();
  }, [user]);

  const handleToggleMaintenance = (checked: boolean) => {
    setMaintenanceMode(checked);
    localStorage.setItem('gameverse_maintenance_mode', checked ? 'true' : 'false');
    onShowNotification(
      checked ? 'Maintenance Mode Active ⚠️' : 'Systems Operational ✅',
      checked
        ? 'Website access restricted. Only authorized admin units can bypass.'
        : 'Maintenance bypass terminated. Public gates fully active.',
      checked ? 'info' : 'success'
    );
  };

  const handleReviewApprove = async (id: string) => {
    try {
      await approveReview(id);
      onShowNotification('Review Approved! ✅', 'Review is now visible to all players on catalog detail sheets.', 'success');
      setPendingReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewReject = async (id: string) => {
    try {
      await deleteReview(id);
      onShowNotification('Review Removed! 🗑️', 'Specified pending comment review has been deleted from indices.', 'info');
      setPendingReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleInboxDelete = async (id: string) => {
    try {
      await deleteContactMessage(id);
      onShowNotification('Message Archived! 📥', 'Contact transmission deleted from inbox records.', 'info');
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameSlug.trim() || !gameTitle.trim()) return;

    try {
      const gamePayload = {
        title: gameTitle,
        category: gameCategory,
        description: gameDesc,
        thumbnail: gameThumb || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600',
        developer: gameDev,
        version: gameVersion,
        featured: gameFeatured,
      };

      if (editingGameId) {
        // Edit Game
        await updateGame(editingGameId, gamePayload);
        onShowNotification('Game Core Updated! 🎮', `Modified entry values for ${gameTitle} successfully.`, 'success');
      } else {
        // Add New Game
        await createGame({
          id: gameSlug,
          ...gamePayload,
          rating: 5.0,
          playersCount: 0,
          releaseDate: new Date().toISOString().split('T')[0],
        });
        onShowNotification('Game Core Created! 🚀', `Successfully integrated ${gameTitle} into active channels.`, 'success');
      }

      // Reset Form & Reload list
      resetForm();
      const list = await getGames();
      setGames(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTrigger = (game: Game) => {
    setEditingGameId(game.id);
    setGameSlug(game.id);
    setGameTitle(game.title);
    setGameCategory(game.category);
    setGameDesc(game.description);
    setGameThumb(game.thumbnail);
    setGameDev(game.developer);
    setGameVersion(game.version);
    setGameFeatured(game.featured);
    setShowGameForm(true);
  };

  const handleDeleteTrigger = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game core from index arrays?')) return;
    try {
      await deleteGame(id);
      onShowNotification('Game Core Deleted! 💣', 'Specified game catalog file deleted successfully.', 'info');
      const list = await getGames();
      setGames(list);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingGameId(null);
    setGameSlug('');
    setGameTitle('');
    setGameCategory('Shooting');
    setGameDesc('');
    setGameThumb('');
    setGameDev('');
    setGameVersion('1.0.0');
    setGameFeatured(false);
    setShowGameForm(false);
  };

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-6xl mx-auto w-full text-left">
        {/* Header */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-amber-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
            <Shield className="text-red-500 w-8 h-8" />
            ADMINISTRATOR ROOT TERMINAL
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Monitor live server telemetry, moderate comments, &amp; edit modules</p>
        </header>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-2 mb-8 bg-zinc-950/40 p-2 border border-zinc-900 rounded-2xl font-mono text-xs font-bold">
          <button
            onClick={() => { setActiveTab('overview'); resetForm(); }}
            className={`flex-1 py-2.5 px-4 rounded-xl transition ${activeTab === 'overview' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition ${activeTab === 'games' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Module Catalog ({games.length})
          </button>
          <button
            onClick={() => { setActiveTab('reviews'); resetForm(); }}
            className={`flex-1 py-2.5 px-4 rounded-xl transition ${activeTab === 'reviews' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Reviews Pending ({pendingReviews.length})
          </button>
          <button
            onClick={() => { setActiveTab('inbox'); resetForm(); }}
            className={`flex-1 py-2.5 px-4 rounded-xl transition ${activeTab === 'inbox' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Feedback Inbox ({messages.length})
          </button>
          <button
            onClick={() => { setActiveTab('settings'); resetForm(); }}
            className={`flex-1 py-2.5 px-4 rounded-xl transition ${activeTab === 'settings' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            System Settings
          </button>
        </div>

        {/* Dashboard Panels */}

        {/* 1. OVERVIEW Tab */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-8 font-mono text-xs">
            {/* Metric grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <span className="text-zinc-550 uppercase font-bold text-[10px]">TOTAL GAMES</span>
                <div className="text-3xl font-black text-blue-500 mt-2">{games.length}</div>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <span className="text-zinc-550 uppercase font-bold text-[10px]">PENDING REVIEWS</span>
                <div className="text-3xl font-black text-amber-500 mt-2">{pendingReviews.length}</div>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <span className="text-zinc-550 uppercase font-bold text-[10px]">UNREAD FEEDBACKS</span>
                <div className="text-3xl font-black text-emerald-500 mt-2">{messages.length}</div>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <span className="text-zinc-550 uppercase font-bold text-[10px]">MAINTENANCE LOCK</span>
                <div className={`text-sm font-black mt-4 uppercase ${maintenanceMode ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                  {maintenanceMode ? '● LOCK ENFORCED' : '● SYSTEM NORMAL'}
                </div>
              </div>
            </div>

            {/* Quick alert bar */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-yellow-500 w-8 h-8 shrink-0" />
                <div className="text-left">
                  <h3 className="font-bold text-sm text-zinc-200 uppercase">DATABASE CONFIGURATION SAFE</h3>
                  <p className="text-zinc-500 mt-0.5 leading-relaxed">
                    Dynamic firestore.rules security boundaries are locked. Double check metadata schemas during updates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CATALOG GAME MANAGER Tab */}
        {activeTab === 'games' && (
          <div className="flex flex-col gap-6 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase">ACTIVE GAMES ({games.length})</span>
              {!showGameForm && (
                <button
                  onClick={() => setShowGameForm(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add Game Core
                </button>
              )}
            </div>

            {/* Game form wizard */}
            {showGameForm && (
              <form onSubmit={handleSaveGame} className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col gap-4 text-left">
                <h3 className="text-sm font-bold text-zinc-250 uppercase mb-2">
                  {editingGameId ? 'Edit Active Game File' : 'Register New Game File'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Slug / ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Unique Slug ID (lowercase, e.g. 'space-shooter')</label>
                    <input
                      type="text"
                      disabled={editingGameId !== null}
                      value={gameSlug}
                      onChange={(e) => setGameSlug(e.target.value)}
                      required
                      placeholder="Enter slug ID..."
                      className="bg-zinc-900 border border-zinc-850 px-3 py-2.5 rounded-xl focus:border-blue-500 focus:outline-none text-zinc-100"
                    />
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Game Name</label>
                    <input
                      type="text"
                      value={gameTitle}
                      onChange={(e) => setGameTitle(e.target.value)}
                      required
                      placeholder="Enter title name..."
                      className="bg-zinc-900 border border-zinc-850 px-3 py-2.5 rounded-xl focus:border-blue-500 focus:outline-none text-zinc-100"
                    />
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Category Core</label>
                    <select
                      value={gameCategory}
                      onChange={(e) => setGameCategory(e.target.value)}
                      className="bg-zinc-900 border border-zinc-850 p-2.5 rounded-xl focus:border-blue-500 focus:outline-none text-zinc-300"
                    >
                      <option value="Shooting">Shooting</option>
                      <option value="Arcade">Arcade</option>
                      <option value="Puzzle">Puzzle</option>
                      <option value="Strategy">Strategy</option>
                      <option value="Action">Action</option>
                    </select>
                  </div>

                  {/* Version */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Version ID (e.g. '1.0.0')</label>
                    <input
                      type="text"
                      value={gameVersion}
                      onChange={(e) => setGameVersion(e.target.value)}
                      required
                      className="bg-zinc-900 border border-zinc-850 px-3 py-2.5 rounded-xl focus:border-blue-500 focus:outline-none text-zinc-100"
                    />
                  </div>

                  {/* Developer */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Developer Label</label>
                    <input
                      type="text"
                      value={gameDev}
                      onChange={(e) => setGameDev(e.target.value)}
                      placeholder="Enter developer label..."
                      className="bg-zinc-900 border border-zinc-850 px-3 py-2.5 rounded-xl focus:border-blue-500 focus:outline-none text-zinc-100"
                    />
                  </div>

                  {/* Thumbnail URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Thumbnail Graphic URL</label>
                    <input
                      type="text"
                      value={gameThumb}
                      onChange={(e) => setGameThumb(e.target.value)}
                      placeholder="Paste graphic link URL..."
                      className="bg-zinc-900 border border-zinc-850 px-3 py-2.5 rounded-xl focus:border-blue-500 focus:outline-none text-zinc-100"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Operational Manual / Description</label>
                  <textarea
                    rows={3}
                    value={gameDesc}
                    onChange={(e) => setGameDesc(e.target.value)}
                    placeholder="Enter manual details..."
                    className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl focus:border-blue-500 focus:outline-none text-zinc-100 resize-none"
                  />
                </div>

                {/* Featured checkbox */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="featured-field"
                    checked={gameFeatured}
                    onChange={(e) => setGameFeatured(e.target.checked)}
                    className="accent-blue-500 w-4 h-4 rounded"
                  />
                  <label htmlFor="featured-field" className="text-zinc-400 font-bold select-none cursor-pointer">
                    Promote to Homepage Featured shelf
                  </label>
                </div>

                <div className="flex gap-2.5 mt-4">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    {editingGameId ? 'Update Game File' : 'Register Game Core'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl transition border border-zinc-850 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* List Table of active games */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-12 bg-zinc-900/30 p-3 font-bold border-b border-zinc-900 text-zinc-500">
                <div className="col-span-2">SLUG</div>
                <div className="col-span-4">TITLE NAME</div>
                <div className="col-span-2">CATEGORY</div>
                <div className="col-span-2">FEATURED</div>
                <div className="col-span-2 text-right">CONTROLS</div>
              </div>

              <div className="flex flex-col">
                {games.map((g) => (
                  <div key={g.id} className="grid grid-cols-12 p-3 items-center border-b border-zinc-900/40">
                    <div className="col-span-2 text-blue-400 font-semibold">{g.id}</div>
                    <div className="col-span-4 font-bold text-zinc-200 truncate pr-2">{g.title}</div>
                    <div className="col-span-2 text-zinc-500 uppercase">{g.category}</div>
                    <div className="col-span-2 font-bold uppercase text-zinc-500">
                      {g.featured ? (
                        <span className="text-emerald-500">PROMOTED</span>
                      ) : (
                        'Standard'
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleEditTrigger(g)}
                        className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded transition"
                        title="Edit File"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(g.id)}
                        className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-red-400 rounded transition"
                        title="Delete File"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. REVIEWS MODERATION Tab */}
        {activeTab === 'reviews' && (
          <div className="flex flex-col gap-6 font-mono text-xs">
            <span className="text-xs font-bold text-zinc-400 uppercase">PENDING REVIEWS FOR APPROVAL ({pendingReviews.length})</span>

            <div className="flex flex-col gap-4">
              {pendingReviews.length === 0 ? (
                <div className="text-center py-16 bg-zinc-950 border border-zinc-900 rounded-2xl p-6 text-zinc-650">
                  ALL OUTSTANDING REVIEWS LOGS APPROVED. SYSTEM CLEAR.
                </div>
              ) : (
                pendingReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span className="font-bold text-zinc-300">{rev.userName}</span>
                        <span>•</span>
                        <span className="text-blue-400 font-semibold uppercase">{rev.gameId}</span>
                        <span>•</span>
                        <span className="text-yellow-500">★ {rev.rating}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        "{rev.reviewText}"
                      </p>
                    </div>

                    <div className="flex gap-2.5 shrink-0 self-end md:self-auto">
                      <button
                        onClick={() => handleReviewApprove(rev.id!)}
                        className="px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={11} /> APPROVE
                      </button>
                      <button
                        onClick={() => handleReviewReject(rev.id!)}
                        className="px-3 py-1.5 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <X size={11} /> REJECT
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. FEEDBACK INBOX Tab */}
        {activeTab === 'inbox' && (
          <div className="flex flex-col gap-6 font-mono text-xs">
            <span className="text-xs font-bold text-zinc-400 uppercase">FEEDBACK BULLETINS ({messages.length})</span>

            <div className="flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="text-center py-16 bg-zinc-950 border border-zinc-900 rounded-2xl p-6 text-zinc-650">
                  NO TRANSMITTED CONTACT MESSAGES OR REVIEWS REPORTED.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-left relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start border-b border-zinc-900 pb-2.5 mb-3 text-zinc-550">
                      <div>
                        <div className="font-bold text-zinc-300 text-xs">
                          {msg.name} <span className="font-normal text-[10px] text-zinc-550">&lt;{msg.email}&gt;</span>
                        </div>
                        <div className="text-[10px] mt-0.5 font-semibold text-blue-400 uppercase tracking-widest">
                          SUBJECT: {msg.subject}
                        </div>
                      </div>
                      <button
                        onClick={() => handleInboxDelete(msg.id!)}
                        className="text-zinc-650 hover:text-red-400 p-1 transition"
                        title="Archive bulletin"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                      {msg.message}
                    </p>
                    <div className="text-right text-[9px] text-zinc-650 mt-3 uppercase">
                      LOG_TIME: {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. SETTINGS Tab */}
        {activeTab === 'settings' && (
          <form onSubmit={(e) => e.preventDefault()} className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col gap-5 text-left font-mono text-xs">
            <h3 className="text-sm font-bold text-zinc-250 uppercase mb-2">SYSTEM CONFIGURATION SWITCHBOARD</h3>

            {/* Maintenance toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl">
              <div>
                <div className="font-bold text-zinc-350">MAINTENANCE BYPASS SWITCH</div>
                <div className="text-[10px] text-zinc-550 mt-1 max-w-sm">
                  Lockdown client-side browser catalog browsing routes immediately. Admins retain full credentials.
                </div>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => handleToggleMaintenance(e.target.checked)}
                className="accent-blue-500 w-5 h-5 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Simulated server fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Google Analytics measurement ID</span>
                <input
                  type="text"
                  disabled
                  value="G-MEASUREMENT-ID-EMULATED"
                  className="bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-xl text-zinc-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">AdSense Publisher ID</span>
                <input
                  type="text"
                  disabled
                  value="pub-75910405105202"
                  className="bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-xl text-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
