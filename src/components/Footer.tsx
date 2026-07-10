/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Gamepad2, Twitter, Youtube, Github, Mail, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { submitContactMessage } from '../lib/dbHelper';

interface FooterProps {
  onNavigate: (page: string) => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
}

export default function Footer({ onNavigate, onShowNotification }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      // Save newsletter subscription as feedback message
      await submitContactMessage({
        name: 'Newsletter Subscriber',
        email,
        subject: 'Newsletter Subscription',
        message: 'User subscribed to the weekly newsletter.',
        type: 'feedback',
      });

      setSubscribed(true);
      setEmail('');
      onShowNotification('Newsletter Subscribed! 📧', 'Thank you for subscribing to GameVerse releases and tournament schedules!', 'success');
    } catch (err) {
      console.error('Newsletter failed:', err);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-black border-t border-zinc-900/80 text-zinc-400 font-sans mt-auto">
      {/* Newsletter Block */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-zinc-900 items-center">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Mail className="text-blue-500 w-5 h-5 animate-pulse" />
            STAY IN THE FIELD
          </h3>
          <p className="text-sm mt-1 text-zinc-500 max-w-sm font-mono leading-relaxed">
            Get notified immediately when new games drop, weekly tournaments update, and double-points weeks launch.
          </p>
        </div>
        <div>
          {subscribed ? (
            <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-950/20 border border-emerald-900 p-4 rounded-xl font-mono text-sm">
              <Check size={18} />
              <span>COMMUNICATION PATH SECURED. ENJOY RELEASES!</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full max-w-md">
              <input
                type="email"
                placeholder="Secure terminal email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:outline-none px-4 py-3 rounded-xl text-sm text-zinc-100 font-mono"
              />
              <button
                type="submit"
                className="px-5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl flex items-center gap-1 transition shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <span>JOIN</span>
                <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Links & Credits */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-white font-black tracking-widest text-lg cursor-pointer" onClick={() => onNavigate('home')}>
            <Gamepad2 className="text-blue-500 w-6 h-6 rotate-12" />
            GAME<span className="text-blue-500">VERSE</span>
          </div>
          <p className="text-xs text-zinc-550 mt-3 font-mono leading-relaxed max-w-xs">
            A premium cybernetic gaming platform centered on HTML5 physics gameplay, global leaderboards, and AI recommendations.
          </p>
          <div className="flex gap-4 mt-5">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition">
              <Twitter size={16} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition">
              <Youtube size={16} />
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition">
              <Github size={16} />
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="text-xs font-bold text-zinc-300 tracking-widest uppercase font-mono mb-4">NAVIGATE</h4>
          <ul className="flex flex-col gap-2.5 text-xs text-zinc-500">
            <li><button onClick={() => onNavigate('home')} className="hover:text-blue-400 transition">Terminal Home</button></li>
            <li><button onClick={() => onNavigate('games')} className="hover:text-blue-400 transition">Game Catalog</button></li>
            <li><button onClick={() => onNavigate('leaderboard')} className="hover:text-blue-400 transition">Global Scores</button></li>
            <li><button onClick={() => onNavigate('blog')} className="hover:text-blue-400 transition">Cyber Logs Blog</button></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="text-xs font-bold text-zinc-300 tracking-widest uppercase font-mono mb-4">RESOURCES</h4>
          <ul className="flex flex-col gap-2.5 text-xs text-zinc-500">
            <li><button onClick={() => onNavigate('achievements')} className="hover:text-blue-400 transition">Achievements</button></li>
            <li><button onClick={() => onNavigate('about')} className="hover:text-blue-400 transition">About System</button></li>
            <li><button onClick={() => onNavigate('contact')} className="hover:text-blue-400 transition">Core Feedback</button></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-xs font-bold text-zinc-300 tracking-widest uppercase font-mono mb-4">SECURITY & RULES</h4>
          <ul className="flex flex-col gap-2.5 text-xs text-zinc-500">
            <li><button onClick={() => onNavigate('privacy')} className="hover:text-blue-400 transition">Privacy Protocols</button></li>
            <li><button onClick={() => onNavigate('cookies')} className="hover:text-blue-400 transition">Cookie Settings</button></li>
            <li><button onClick={() => onNavigate('terms')} className="hover:text-blue-400 transition">Terms & Terms</button></li>
          </ul>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="bg-black border-t border-zinc-950 py-6 text-center text-[10px] text-zinc-600 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <span>&copy; {currentYear} GAMEVERSE CORE. ALL RIGHTS RESERVED.</span>
          <span className="flex items-center gap-1.5 justify-center">
            <ShieldCheck size={12} className="text-blue-500" />
            ENCRYPTED CLOUD INTERGITY • SYSTEM NORMAL
          </span>
        </div>
      </div>
    </footer>
  );
}
