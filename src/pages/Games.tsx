/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Gamepad2, Play, Star, Sparkles } from 'lucide-react';
import { Game } from '../types';
import { getGames } from '../lib/dbHelper';
import { CATEGORIES } from '../data/initialData';

interface GamesProps {
  onNavigate: (page: string, params?: Record<string, any>) => void;
  initialParams?: Record<string, any>;
}

export default function Games({ onNavigate, initialParams }: GamesProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState(initialParams?.search || '');
  const [selectedCategory, setSelectedCategory] = useState(initialParams?.category || 'All');
  const [sortBy, setSortBy] = useState<'rating' | 'players' | 'newest' | 'az'>('players');

  // Load Catalog
  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      const list = await getGames();
      setGames(list);
      setLoading(false);
    };
    fetchGames();
  }, []);

  // Sync Search and category changes from other routes
  useEffect(() => {
    if (initialParams?.search) setSearchQuery(initialParams.search);
    if (initialParams?.category) setSelectedCategory(initialParams.category);
  }, [initialParams]);

  // Apply Filters & Sorting
  useEffect(() => {
    let result = [...games];

    // 1. Live Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
      );
    }

    // 2. Category selection
    if (selectedCategory !== 'All') {
      result = result.filter((g) => g.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // 3. Sorting
    if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'players') {
      result.sort((a, b) => b.playersCount - a.playersCount);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    } else if (sortBy === 'az') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    setFilteredGames(result);
  }, [games, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Banner Section */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10 text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none">GAME CORE SHELF</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Discover &amp; Sweeps HTML5 Physics-Based Game Modules</p>
        </header>

        {/* Filter Toolbar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-8 bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">
          {/* Search box */}
          <div className="md:col-span-5 relative w-full">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs font-mono pl-9 pr-4 py-2.5 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-full"
            />
            <Search size={14} className="absolute left-3 top-3.5 text-zinc-500" />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs font-mono p-2.5 rounded-xl text-zinc-300 focus:outline-none focus:border-blue-500 w-full cursor-pointer"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort selection */}
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap uppercase">SORT BY:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 text-xs font-mono p-2.5 rounded-xl text-zinc-300 focus:outline-none focus:border-blue-500 w-full cursor-pointer"
            >
              <option value="players">Popularity</option>
              <option value="rating">Highest Rating</option>
              <option value="newest">New Releases</option>
              <option value="az">A - Z Index</option>
            </select>
          </div>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-zinc-950 border border-zinc-900 h-64 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-24 bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
            <SlidersHorizontal className="text-zinc-600 w-12 h-12 mx-auto mb-4 animate-bounce" />
            <h3 className="font-bold text-base text-zinc-300 font-mono">NO SYSTEMS MATCH FILTERS</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Please try refining your live search parameter, or select another core category from the filter toolbar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                onClick={() => onNavigate('game-details', { id: game.id })}
                className="bg-zinc-950 border border-zinc-900 hover:border-blue-500/25 rounded-2xl overflow-hidden cursor-pointer group transition-all"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-black/85 backdrop-blur text-[9px] font-mono font-bold tracking-widest uppercase rounded text-blue-400 border border-blue-500/15">
                    {game.category}
                  </span>
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/85 backdrop-blur text-[9px] font-mono font-bold text-yellow-400 rounded flex items-center gap-0.5 border border-yellow-500/15">
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
                    <span className="text-[10px] font-mono text-zinc-550">
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
        )}
      </div>
    </div>
  );
}
