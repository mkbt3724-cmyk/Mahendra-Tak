/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  TrendingUp,
  Trophy,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Gamepad2,
  Users,
  ChevronRight,
  Heart,
  Star,
} from 'lucide-react';
import { UserProfile, Game, BlogPost } from '../types';
import { getGames, getBlogs, getLeaderboard } from '../lib/dbHelper';

interface HomeProps {
  user: UserProfile | null;
  onNavigate: (page: string, params?: Record<string, any>) => void;
  onTriggerLogin: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
}

export default function Home({
  user,
  onNavigate,
  onTriggerLogin,
  onShowNotification,
}: HomeProps) {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [trendingGames, setTrendingGames] = useState<Game[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [topScores, setTopScores] = useState<any[]>([]);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [selectedHomeCategory, setSelectedHomeCategory] = useState<string | null>(null);

  // Load Catalog Data
  useEffect(() => {
    const loadData = async () => {
      const all = await getGames();
      setAllGames(all);
      setFeaturedGames(all.filter((g) => g.featured));
      setTrendingGames(all.slice(0, 3));

      const posts = await getBlogs();
      setBlogs(posts.slice(0, 2));

      // Get some leaderboards to list top players
      const leader = await getLeaderboard('space-shooter', 3);
      setTopScores(leader);
    };
    loadData();
  }, []);

  // Fetch AI recommendations from backend API
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) {
        setAiRecs([]);
        return;
      }
      setAiLoading(true);
      try {
        const catalog = await getGames();
        // Emulate recent history as games they didn't favorite yet or just static
        const res = await fetch('/api/recommend-games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userHistory: ['minesweeper'],
            userFavorites: ['space-shooter'],
            allGames: catalog,
          }),
        });
        const data = await res.json();
        if (data && data.recommendations) {
          // Join catalog info
          const recJoined = data.recommendations.map((rec: any) => {
            const gameObj = catalog.find((g) => g.id === rec.gameId);
            return {
              ...rec,
              game: gameObj,
            };
          }).filter((rec: any) => rec.game !== undefined);
          setAiRecs(recJoined);
        }
      } catch (err) {
        console.error('AI rec failed:', err);
      } finally {
        setAiLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  const categoryIcons: Record<string, string> = {
    Shooting: '🎯',
    Arcade: '👾',
    Puzzle: '🧩',
    Strategy: '🧠',
    Action: '⚡',
    RPG: '🛡️',
    Adventure: '🧭',
    Racing: '🏎️',
    Sports: '⚽',
    Horror: '👻',
    Simulation: '💻',
    Multiplayer: '👥',
    Fighting: '🥊',
  };

  const categories = Object.keys(categoryIcons).map((catName) => {
    const count = allGames.filter((g) => g.category.toLowerCase() === catName.toLowerCase()).length;
    return {
      name: catName,
      count,
      icon: categoryIcons[catName] || '🎮',
    };
  });

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black">
      {/* Hero Banner Grid */}
      <section className="relative w-full overflow-hidden border-b border-zinc-900/40 bg-zinc-950 py-20 px-6">
        {/* Neon glowing decorative background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-xs font-semibold text-blue-400 font-mono tracking-widest uppercase mb-6 animate-pulse">
              <Sparkles size={12} />
              <span>STABILIZING NEXT-GEN CORES</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-zinc-150">
              PLAY • COMPETE <br />
              <span className="text-blue-500 text-glow-blue">WIN</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 mt-6 leading-relaxed max-w-lg font-mono">
              Welcome to <span className="text-white font-bold">GameVerse</span>. Launch cybernetic retro-future HTML5 games inside your browser. Climb local score arrays, earn badges, and bypass latency boundaries.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <button
                onClick={() => onNavigate('games')}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold tracking-wider text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer active:scale-95 transition"
              >
                <Play size={14} fill="currentColor" />
                <span>PLAY NOW</span>
              </button>
              <button
                onClick={() => onNavigate('about')}
                className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold tracking-wider text-xs border border-zinc-850 cursor-pointer transition"
              >
                <span>EXPLORE CORES</span>
              </button>
            </div>
          </div>

          {/* Decorative Hero illustration */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="aspect-square w-full max-w-md bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
              <div className="flex justify-between items-center text-zinc-500 font-mono text-[10px]">
                <span>SERVER: US-WEST-2</span>
                <span className="text-emerald-500 animate-pulse">● LATENCY: 14MS</span>
              </div>

              <div className="my-auto flex flex-col items-center">
                <Gamepad2 className="text-blue-500 w-24 h-24 rotate-12 animate-bounce" />
                <span className="text-xl font-black mt-4 tracking-widest text-zinc-300">GAMEVERSE 2.0</span>
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>USERS_ONLINE: 1,540</span>
                <span>DB_SYNC: OK</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Personalized Recommendations Shelves */}
      {user && (
        <section className="max-w-7xl mx-auto px-6 py-12 w-full">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight text-zinc-100">
                <Sparkles className="text-blue-400 w-4 h-4 animate-pulse" />
                AI RECOMMENDED FOR YOU
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5 font-mono">Personalized match analysis by Gemini-3.5-flash</p>
            </div>
          </div>

          {aiLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900/35 h-32 rounded-xl animate-pulse border border-zinc-850" />
              <div className="bg-zinc-900/35 h-32 rounded-xl animate-pulse border border-zinc-850" />
            </div>
          ) : aiRecs.length === 0 ? (
            <div className="p-6 bg-zinc-900/20 border border-zinc-900 rounded-2xl text-center text-xs text-zinc-500 font-mono">
              Evaluating your gameplay history. Unlock scores and achievements to bootstrap neural recommendations!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {aiRecs.map((rec) => (
                <div
                  key={rec.gameId}
                  className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex gap-4 hover:border-blue-500/20 transition group"
                >
                  <img
                    src={rec.game.thumbnail}
                    alt={rec.game.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm truncate text-zinc-250 group-hover:text-blue-400 transition">
                        {rec.game.title}
                      </h3>
                      <span className="shrink-0 px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-900/30 text-[10px] font-mono font-bold rounded">
                        {rec.matchScore}% MATCH
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                      {rec.reason}
                    </p>
                    <button
                      onClick={() => onNavigate('game-details', { id: rec.game.id })}
                      className="mt-2.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono uppercase"
                    >
                      <span>Load Game</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured Games Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-150">
              <TrendingUp className="text-blue-500 w-5 h-5" />
              HOT RELEASED SHELF
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">Vetted and featured high-contrast cyber games</p>
          </div>
          <button
            onClick={() => onNavigate('games')}
            className="text-xs font-bold text-zinc-400 hover:text-blue-400 flex items-center gap-1 font-mono uppercase"
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredGames.map((game) => (
            <div
              key={game.id}
              onClick={() => onNavigate('game-details', { id: game.id })}
              className="bg-zinc-950 border border-zinc-900 hover:border-blue-500/30 rounded-2xl overflow-hidden cursor-pointer group transition-all"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                <img
                  src={game.thumbnail}
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-black/80 backdrop-blur text-[9px] font-mono font-bold tracking-widest uppercase rounded text-blue-400 border border-blue-500/20">
                  {game.category}
                </span>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur text-[9px] font-mono font-bold text-yellow-400 rounded flex items-center gap-0.5 border border-yellow-500/20">
                  <Star size={9} fill="currentColor" /> {game.rating}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm text-zinc-200 group-hover:text-blue-400 transition truncate">
                  {game.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {game.description}
                </p>
                <div className="flex justify-between items-center mt-4 border-t border-zinc-900 pt-3">
                  <span className="text-[10px] font-mono text-zinc-500">
                    👥 {game.playersCount} players
                  </span>
                  <button className="text-[10px] font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-0.5 font-mono uppercase">
                    <span>PLAY</span>
                    <Play size={10} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pop Categories Bento Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-2">
          <div>
            <h2 className="text-lg font-bold text-zinc-150 font-mono tracking-wider">POPULAR CORES CATEGORIES</h2>
            <p className="text-xs text-zinc-550 font-mono mt-0.5 uppercase">Select any core sector to query active game modules</p>
          </div>
          {selectedHomeCategory && (
            <button
              onClick={() => setSelectedHomeCategory(null)}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 uppercase bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Clear Selection ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const isSelected = selectedHomeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => {
                  setSelectedHomeCategory(isSelected ? null : cat.name);
                }}
                className={`flex flex-col items-center justify-center text-center p-4 rounded-xl border transition-all cursor-pointer group relative ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/5 text-blue-400'
                    : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                }`}
              >
                <span className={`text-2xl mb-2 transition duration-200 ${
                  isSelected ? 'scale-110 filter-none' : 'filter grayscale group-hover:grayscale-0'
                }`}>
                  {cat.icon}
                </span>
                <span className={`font-bold text-xs ${isSelected ? 'text-blue-400' : 'text-zinc-300'}`}>
                  {cat.name}
                </span>
                <span className={`text-[9px] font-mono mt-1 uppercase ${
                  isSelected ? 'text-blue-500' : 'text-zinc-500'
                }`}>
                  {cat.count > 0 ? `${cat.count} AVAILABLE` : '0 READY'}
                </span>

                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-black animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Category Game Shelf */}
        {selectedHomeCategory && (
          <div className="mt-6 p-6 bg-zinc-950 border border-zinc-900 rounded-2xl relative overflow-hidden animate-fadeIn text-left">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-transparent pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="font-mono text-xs font-bold text-zinc-300 uppercase tracking-widest">
                  System Array: {selectedHomeCategory} Games
                </h3>
              </div>
              <button
                onClick={() => onNavigate('games', { category: selectedHomeCategory })}
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300 uppercase flex items-center gap-1"
              >
                <span>Go to page</span>
                <ChevronRight size={10} />
              </button>
            </div>

            {allGames.filter((g) => g.category.toLowerCase() === selectedHomeCategory.toLowerCase()).length === 0 ? (
              <div className="py-12 text-center border border-dashed border-zinc-900 rounded-xl text-xs text-zinc-650 font-mono">
                NO REGISTERED GAMES CURRENTLY READY IN {selectedHomeCategory.toUpperCase()} CATEGORY
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allGames
                  .filter((g) => g.category.toLowerCase() === selectedHomeCategory.toLowerCase())
                  .map((game) => (
                    <div
                      key={game.id}
                      className="bg-black/60 border border-zinc-900/60 hover:border-zinc-800/80 rounded-xl p-3.5 flex gap-4 hover:shadow-lg transition-all duration-300 group"
                    >
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        className="w-16 h-16 rounded-lg object-cover shrink-0 bg-zinc-900 border border-zinc-900"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-xs truncate text-zinc-200 group-hover:text-blue-400 transition">
                              {game.title}
                            </h4>
                            <span className="shrink-0 text-[10px] font-mono text-yellow-500 font-bold flex items-center gap-0.5">
                              ★ {game.rating}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 leading-normal">
                            {game.description}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-900/50">
                          <span className="text-[9px] font-mono text-zinc-600">
                            👤 {game.playersCount} players
                          </span>
                          <button
                            onClick={() => onNavigate('game-details', { id: game.id })}
                            className="px-3 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-500 rounded-lg text-[9px] font-mono font-bold uppercase transition flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <span>PLAY GAME</span>
                            <Play size={8} fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Cyber Blogs Block */}
      <section className="max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Latest Blogs */}
        <div className="lg:col-span-8">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-lg font-bold text-zinc-150 flex items-center gap-2">
              <BookOpen className="text-blue-500 w-4 h-4" />
              CYBERNETIC BLOG RECORDS
            </h2>
            <button
              onClick={() => onNavigate('blog')}
              className="text-xs font-bold text-zinc-550 hover:text-blue-400 font-mono uppercase"
            >
              View Log
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                onClick={() => onNavigate('blog-article', { id: blog.id })}
                className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 cursor-pointer transition group"
              >
                <img
                  src={blog.coverImage}
                  alt={blog.title}
                  className="w-full sm:w-36 aspect-video sm:aspect-square rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-blue-500 uppercase">
                    {blog.category}
                  </span>
                  <h3 className="font-bold text-sm text-zinc-200 group-hover:text-blue-400 transition mt-1 truncate">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {blog.summary}
                  </p>
                  <div className="flex justify-between items-center mt-3 text-[10px] text-zinc-550 font-mono">
                    <span>By {blog.authorName}</span>
                    <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Score Leaders Shelf */}
        <div className="lg:col-span-4">
          <h2 className="text-lg font-bold text-zinc-150 flex items-center gap-2 mb-6">
            <Trophy className="text-yellow-500 w-4 h-4 animate-bounce" />
            TOP CADET ARRAYS
          </h2>

          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3 font-mono">
            {topScores.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-650">
                NO REGISTERED FLIGHT LOGS YET.
              </div>
            ) : (
              topScores.map((score, idx) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-900 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-blue-400 w-4">#{idx + 1}</span>
                    <img
                      src={score.userPhoto}
                      alt={score.userName}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                    <span className="text-xs font-bold text-zinc-300 truncate max-w-[120px]">
                      {score.userName}
                    </span>
                  </div>
                  <span className="text-xs font-black text-yellow-500">
                    {score.score} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
