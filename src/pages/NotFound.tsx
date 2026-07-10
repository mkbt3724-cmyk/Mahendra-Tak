/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, ArrowLeft, Gamepad2 } from 'lucide-react';

interface NotFoundProps {
  onNavigate: (page: string) => void;
}

export default function NotFound({ onNavigate }: NotFoundProps) {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center text-white bg-black p-6 font-mono text-xs">
      <ShieldAlert className="text-red-500 w-16 h-16 mb-4 animate-pulse" />
      <h1 className="text-3xl font-black tracking-tight text-white uppercase mb-2">404: SECTOR DISPLACED</h1>
      <p className="text-zinc-500 max-w-sm mb-6 leading-relaxed text-center uppercase">
        The coordinates you requested do not exist in the catalog directory matrix. Reboot your route sensors.
      </p>
      <button
        onClick={() => onNavigate('home')}
        className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 transition flex items-center gap-2 uppercase cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Terminal Home
      </button>
    </div>
  );
}
