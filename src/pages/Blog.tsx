/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Calendar, ChevronRight, User } from 'lucide-react';
import { BlogPost } from '../types';
import { getBlogs } from '../lib/dbHelper';

interface BlogProps {
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export default function Blog({ onNavigate }: BlogProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      const list = await getBlogs();
      setBlogs(list);
      setLoading(false);
    };
    fetchBlogs();
  }, []);

  const categories = ['All', 'Announcements', 'Guides', 'DevLog', 'Hardware'];

  const filteredBlogs = blogs.filter((blog) => {
    const matchSearch =
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCat === 'All' || blog.category.toLowerCase() === selectedCat.toLowerCase();
    return matchSearch && matchCat;
  });

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10 text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
            <BookOpen className="text-emerald-500 w-8 h-8" />
            CYBERNETIC CHANNELS LOGS
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Read release bulletins, tournament diaries, and code reviews</p>
        </header>

        {/* Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-8 bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">
          <div className="md:col-span-8 relative">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs font-mono pl-9 pr-4 py-2.5 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-full"
            />
            <Search size={14} className="absolute left-3 top-3.5 text-zinc-500" />
          </div>

          <div className="md:col-span-4">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs font-mono p-2.5 rounded-xl text-zinc-300 focus:outline-none focus:border-blue-500 w-full cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Blog Posts */}
        {loading ? (
          <div className="text-center py-12 text-zinc-650 font-mono text-xs">
            DECRYPTING BULLETINS LOG DATA...
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
            <BookOpen className="text-zinc-600 w-12 h-12 mx-auto mb-4" />
            <h3 className="font-bold text-base text-zinc-300 font-mono">NO LOGS FIT CRITERIA</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto font-mono">
              Adjust your search keywords or categories criteria and sync the records array again.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 mb-12">
            {filteredBlogs.map((blog) => (
              <div
                key={blog.id}
                onClick={() => onNavigate('blog-article', { id: blog.id })}
                className="bg-zinc-950 border border-zinc-900 hover:border-blue-500/15 rounded-2xl overflow-hidden cursor-pointer flex flex-col md:flex-row gap-6 p-5 transition group text-left"
              >
                <img
                  src={blog.coverImage}
                  alt={blog.title}
                  className="w-full md:w-48 aspect-video md:aspect-square rounded-xl object-cover shrink-0"
                />

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <span className="px-2 py-0.5 bg-blue-550/10 border border-blue-500/10 text-[9px] font-mono font-bold tracking-widest text-blue-400 uppercase rounded">
                      {blog.category}
                    </span>
                    <h3 className="text-lg font-bold text-zinc-200 group-hover:text-blue-400 mt-2 truncate transition">
                      {blog.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-2 line-clamp-3 leading-relaxed font-mono">
                      {blog.summary}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-5 pt-3 border-t border-zinc-900 text-[10px] text-zinc-550 font-mono">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-blue-500" />
                      <span>{blog.authorName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                      </span>
                      <button className="text-[10px] font-bold text-blue-400 flex items-center gap-0.5 group-hover:text-blue-300 transition">
                        <span>READ</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
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
