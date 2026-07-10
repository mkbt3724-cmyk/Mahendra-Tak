/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Gamepad2, Users, Code, Award, Cpu, ShieldCheck } from 'lucide-react';

export default function About() {
  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-4xl mx-auto w-full text-left">
        {/* Header */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-teal-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
            <Gamepad2 className="text-blue-500 w-8 h-8" />
            ABOUT THE PLATFORM
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Read operational manuals, systems specs, &amp; team parameters</p>
        </header>

        {/* Mission statement card */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 mb-8">
          <h2 className="text-lg font-bold text-zinc-150 uppercase font-mono tracking-wider mb-4">GAMEVERSE TERMINAL INITIATIVE</h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-mono">
            GameVerse represents a high-density, low-latency gaming portal designed to aggregate fully custom HTML5 physics game engines under a synchronized global database cloud state. Built from the ground up utilizing high-contrast retro aesthetics, glassmorphic interfaces, and robust authentication layers.
          </p>
        </div>

        {/* Core pillar grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 font-mono text-xs text-left">
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
            <Cpu className="text-blue-400 w-8 h-8 mb-4" />
            <h3 className="font-bold text-zinc-200 uppercase mb-2">VECTOR PHYSIC ENGINES</h3>
            <p className="text-zinc-500 leading-relaxed">
              Every arcade or shooter game features sub-millisecond game state updates utilizing canvas drawing frames and sound synthesis loops.
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
            <ShieldCheck className="text-emerald-400 w-8 h-8 mb-4" />
            <h3 className="font-bold text-zinc-200 uppercase mb-2">DYNAMIC COMPLIANCE</h3>
            <p className="text-zinc-500 leading-relaxed">
              Integrates full support for Google Consent Mode v2, persistent tracking permissions, and state-of-the-art Firestore role security boundary rules.
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
            <Award className="text-purple-400 w-8 h-8 mb-4" />
            <h3 className="font-bold text-zinc-200 uppercase mb-2">GAMER MILESTONES</h3>
            <p className="text-zinc-500 leading-relaxed">
              Unlock unique performance achievements, earn gamer score points, and climb localized score indexes against the whole community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
