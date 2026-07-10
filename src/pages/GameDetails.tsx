/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Star,
  User,
  Send,
  Calendar,
  Share2,
  Heart,
  ArrowLeft,
  Trophy,
  Tv,
  Monitor,
  Sparkles,
} from 'lucide-react';
import { Game, Review, LeaderboardEntry, UserProfile } from '../types';
import {
  getGameById,
  getReviewsForGame,
  getLeaderboard,
  submitReview,
} from '../lib/dbHelper';
import { logAnalyticsEvent } from '../lib/firebase';

// Embed playable games
import SpaceShooter from '../components/games/SpaceShooter';
import CyberRunner from '../components/games/CyberRunner';
import CyberMinesweeper from '../components/games/CyberMinesweeper';
import NeuralMatcher from '../components/games/NeuralMatcher';
import CyberBattleship from '../components/games/CyberBattleship';
import CyberSnake from '../components/games/CyberSnake';
import CyberTerminal from '../components/games/CyberTerminal';

interface GameDetailsProps {
  gameId: string;
  user: UserProfile | null;
  onNavigate: (page: string, params?: Record<string, any>) => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
  onTriggerLogin: () => void;
}

export default function GameDetails({
  gameId,
  user,
  onNavigate,
  onShowNotification,
  onTriggerLogin,
}: GameDetailsProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [graphicsQuality, setGraphicsQuality] = useState<'sd' | '1080p' | '4k'>(() => {
    const saved = localStorage.getItem('gameverse_screen_quality');
    return (saved === 'sd' || saved === '1080p' || saved === '4k') ? saved : '1080p';
  });

  // Review submission form states
  const [userRating, setUserRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Load and reload procedures
  const loadGameData = async () => {
    setLoading(true);
    const g = await getGameById(gameId);
    if (!g) {
      onNavigate('games');
      return;
    }
    setGame(g);

    // Track game detail view in Google Analytics
    logAnalyticsEvent('view_item', {
      item_id: g.id,
      item_name: g.title,
      item_category: g.category,
    });

    const r = await getReviewsForGame(gameId);
    setReviews(r);

    const l = await getLeaderboard(gameId, 5);
    setLeaderboard(l);

    setLoading(false);
  };

  useEffect(() => {
    loadGameData();
  }, [gameId]);

  const handleScoreSubmitted = async () => {
    // Reload leaderboard
    const l = await getLeaderboard(gameId, 5);
    setLeaderboard(l);

    // Track score submission in Google Analytics
    logAnalyticsEvent('post_score', {
      game_id: gameId,
      user_name: user?.displayName || 'anonymous',
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onTriggerLogin();
      return;
    }
    if (!reviewText.trim()) return;

    setReviewSubmitting(true);
    try {
      await submitReview({
        gameId,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        rating: userRating,
        reviewText,
        createdAt: new Date().toISOString(),
      });

      // Track review posting in Google Analytics
      logAnalyticsEvent('submit_review', {
        game_id: gameId,
        rating: userRating,
        user_name: user.displayName,
      });

      setReviewText('');
      onShowNotification('Review Posted! ✍️', 'Thank you! Your feedback has been recorded and improves matchmaking data.', 'success');

      // Reload reviews and rating
      const r = await getReviewsForGame(gameId);
      setReviews(r);

      const updatedGame = await getGameById(gameId);
      if (updatedGame) setGame(updatedGame);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    onShowNotification('Terminal Link Copied! 🔗', 'System hyperlink has been recorded into your local clipboard.', 'info');
  };

  if (loading || !game) {
    return (
      <div className="w-full flex-1 flex items-center justify-center bg-black py-24 text-zinc-500 font-mono text-xs">
        <Gamepad2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <span>REALLOCATING DIGITAL ASSETS...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Back Link */}
        <button
          onClick={() => onNavigate('games')}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition font-mono text-xs mb-6 uppercase cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Catalog
        </button>

        {/* Hero details layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Title Block */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-600/10 border border-blue-500/20 text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase rounded">
                  {game.category}
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight mt-2">{game.title}</h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-mono text-xs border border-zinc-850 transition"
                  title="Share Link"
                >
                  <Share2 size={13} className="inline mr-1" /> SHARE
                </button>
              </div>
            </div>

            {/* DISPLAY RESOLUTION CONTROLLER */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Monitor size={15} />
                </div>
                <div className="font-mono">
                  <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Graphics & Render Quality</div>
                  <div className="text-[9px] text-zinc-500 uppercase mt-0.5">
                    {graphicsQuality === 'sd' && 'Classic Retro Backbuffer (1.0x Density)'}
                    {graphicsQuality === '1080p' && 'Full-HD vector supersampling (2.0x Density)'}
                    {graphicsQuality === '4k' && '4K Ultra-HD maximum grid precision (4.0x Density)'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-black border border-zinc-900 rounded-xl font-mono text-[10px] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setGraphicsQuality('sd');
                    localStorage.setItem('gameverse_screen_quality', 'sd');
                    onShowNotification('Graphics Set to SD 🎮', 'Classic Retro low-power backbuffer rendering active.', 'info');
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    graphicsQuality === 'sd'
                      ? 'bg-zinc-850 text-white shadow-inner border border-zinc-750'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Tv size={11} /> SD (Classic)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGraphicsQuality('1080p');
                    localStorage.setItem('gameverse_screen_quality', '1080p');
                    onShowNotification('Graphics Enhanced to 1080p FHD ⚡', 'Supersampled high-definition canvas active.', 'success');
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    graphicsQuality === '1080p'
                      ? 'bg-blue-950/50 text-blue-400 border border-blue-500/30 shadow-md shadow-blue-500/5'
                      : 'text-zinc-500 hover:text-blue-400/80'
                  }`}
                >
                  <Monitor size={11} /> 1080p FHD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGraphicsQuality('4k');
                    localStorage.setItem('gameverse_screen_quality', '4k');
                    onShowNotification('Graphics Maxed to 4K UHD 🚀', 'Extreme-fidelity 4K rasterization activated. Maximum pixel density.', 'success');
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    graphicsQuality === '4k'
                      ? 'bg-amber-950/40 text-amber-500 border border-amber-500/30 shadow-md shadow-amber-500/5 animate-pulse'
                      : 'text-zinc-500 hover:text-amber-400/80'
                  }`}
                >
                  <Sparkles size={11} /> 4K Ultra
                </button>
              </div>
            </div>

            {/* Embedded Active Game Module */}
            <div className="w-full">
              {game.id === 'space-shooter' && (
                <SpaceShooter
                  user={user}
                  onScoreSubmitted={handleScoreSubmitted}
                  onShowNotification={onShowNotification}
                  graphicsQuality={graphicsQuality}
                />
              )}
              {game.id === 'cyber-runner' && (
                <CyberRunner
                  user={user}
                  onScoreSubmitted={handleScoreSubmitted}
                  onShowNotification={onShowNotification}
                  graphicsQuality={graphicsQuality}
                />
              )}
              {game.id === 'minesweeper' && (
                <CyberMinesweeper
                  user={user}
                  onScoreSubmitted={handleScoreSubmitted}
                  onShowNotification={onShowNotification}
                  graphicsQuality={graphicsQuality}
                />
              )}
              {game.id === 'memory-matrix' && (
                <NeuralMatcher
                  user={user}
                  onScoreSubmitted={handleScoreSubmitted}
                  onShowNotification={onShowNotification}
                  graphicsQuality={graphicsQuality}
                />
              )}
              {game.id === 'battleship' && (
                <CyberBattleship
                  user={user}
                  onScoreSubmitted={handleScoreSubmitted}
                  onShowNotification={onShowNotification}
                  graphicsQuality={graphicsQuality}
                />
              )}
              {game.id === 'cyber-snake' && (
                <CyberSnake
                  user={user}
                  onScoreSubmitted={handleScoreSubmitted}
                  onShowNotification={onShowNotification}
                  graphicsQuality={graphicsQuality}
                />
              )}
              {!['space-shooter', 'cyber-runner', 'minesweeper', 'memory-matrix', 'battleship', 'cyber-snake'].includes(game.id) && (
                <CyberTerminal
                  game={game}
                  user={user}
                  onScoreSubmitted={handleScoreSubmitted}
                  onShowNotification={onShowNotification}
                  graphicsQuality={graphicsQuality}
                />
              )}
            </div>

            {/* Game specifications */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 text-left">
              <h2 className="text-base font-bold text-zinc-100">SYSTEM PROFILE</h2>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-mono">
                {game.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-zinc-900 text-left font-mono">
                <div>
                  <span className="text-[10px] text-zinc-550 uppercase">DEVELOPER</span>
                  <div className="text-xs font-bold text-zinc-300 mt-0.5">{game.developer}</div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-550 uppercase">VERSION ID</span>
                  <div className="text-xs font-bold text-zinc-300 mt-0.5">v{game.version}</div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-550 uppercase">RELEASE DATE</span>
                  <div className="text-xs font-bold text-zinc-300 mt-0.5 flex items-center gap-1">
                    <Calendar size={11} />
                    <span>{game.releaseDate}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-550 uppercase">TOTAL USERS</span>
                  <div className="text-xs font-bold text-zinc-300 mt-0.5">👥 {game.playersCount} players</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Area: Leaderboard and reviews */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Embedded Mini Leaderboard */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-left">
              <h2 className="text-xs font-bold tracking-widest text-zinc-400 font-mono flex items-center gap-1.5 uppercase">
                <Trophy className="text-yellow-500 w-4 h-4" />
                ACTIVE HIGH SCORES
              </h2>

              <div className="flex flex-col gap-2.5 mt-4 font-mono">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-zinc-650">
                    NO RECORDED SCORES. START A RUN!
                  </div>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-900/50 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-400 w-4">#{idx + 1}</span>
                        <img
                          src={entry.userPhoto}
                          alt={entry.userName}
                          className="w-6 h-6 rounded object-cover"
                        />
                        <span className="text-[11px] font-bold text-zinc-300 truncate max-w-[100px]">
                          {entry.userName}
                        </span>
                      </div>
                      <span className="text-xs font-black text-yellow-500">
                        {entry.score}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-left">
              <h2 className="text-xs font-bold tracking-widest text-zinc-400 font-mono uppercase border-b border-zinc-900 pb-3 mb-4">
                PILOT REVIEWS ({reviews.length})
              </h2>

              {/* Submit Review Form */}
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3 mb-6">
                <div>
                  <span className="text-[10px] font-mono text-zinc-550 uppercase">Rating Score:</span>
                  <div className="flex gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => setUserRating(stars)}
                        className="text-yellow-500 hover:scale-110 transition p-0.5 cursor-pointer"
                      >
                        <Star size={16} fill={stars <= userRating ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    placeholder={user ? "Write feedback..." : "Please log in to submit reviews."}
                    disabled={!user}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={2}
                    required
                    className="bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none w-full px-3 py-2 text-xs text-zinc-200 placeholder-zinc-650 rounded-xl resize-none font-mono"
                  />
                  {user && (
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="absolute right-2 bottom-3.5 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      <Send size={12} />
                    </button>
                  )}
                </div>
              </form>

              {/* Reviews List */}
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                {reviews.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-zinc-600 font-mono">
                    NO LOGGED REVIEWS. BE THE FIRST!
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-zinc-900/30 border border-zinc-900/60 rounded-xl flex flex-col gap-1.5"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={r.userPhoto}
                            alt={r.userName}
                            className="w-5 h-5 rounded object-cover"
                          />
                          <span className="font-bold text-zinc-300 truncate max-w-[100px]">
                            {r.userName}
                          </span>
                        </div>
                        <div className="flex gap-0.5 text-yellow-500">
                          {Array(r.rating)
                            .fill(0)
                            .map((_, i) => (
                              <Star key={i} size={8} fill="currentColor" />
                            ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono leading-relaxed px-0.5">
                        {r.reviewText}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
