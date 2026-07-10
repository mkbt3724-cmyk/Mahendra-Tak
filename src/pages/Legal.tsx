/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Scale, FileText, HelpCircle } from 'lucide-react';

export default function Legal() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'cookies'>('privacy');

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-3xl mx-auto w-full text-left">
        {/* Header */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-zinc-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
            <Scale className="text-zinc-400 w-8 h-8" />
            LEGAL PROTOCOLS
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Read privacy agreements, consent policies, &amp; service conditions</p>
        </header>

        {/* Tab switchers */}
        <div className="flex gap-2 mb-8 bg-zinc-950/40 p-2 border border-zinc-900 rounded-2xl font-mono text-xs font-bold">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition ${activeTab === 'privacy' ? 'bg-zinc-900 text-white border border-zinc-850' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition ${activeTab === 'terms' ? 'bg-zinc-900 text-white border border-zinc-850' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Terms of Use
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition ${activeTab === 'cookies' ? 'bg-zinc-900 text-white border border-zinc-850' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Consent &amp; Cookies
          </button>
        </div>

        {/* Legal Sheets */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 font-mono text-xs leading-relaxed text-zinc-400 flex flex-col gap-6 text-left">
          {activeTab === 'privacy' && (
            <>
              <h2 className="text-sm font-bold text-zinc-150 uppercase flex items-center gap-2">
                <ShieldCheck className="text-blue-500 w-4 h-4" /> PRIVACY PROTECTION AMENDMENT
              </h2>
              <p>
                This Privacy Protocol defines how GameVerse gathers and treats metadata tags, telemetry play log arrays, and authentication keys.
              </p>
              <div>
                <h3 className="font-bold text-zinc-200 uppercase mb-1">1. DATA ACQUISITION POLICY</h3>
                <p>
                  We store authentication values (display name, email, avatar photo URL) provided by Google Firebase Auth. We record gameplay scores, ratings, reviews, and unlocked achievements count.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-zinc-200 uppercase mb-1">2. SYSTEM COMPLIANCE</h3>
                <p>
                  All files are stored in Google Cloud Run server nodes situated inside California geographic parameters. We do not sell player details or transmit keys to third party marketing affiliates.
                </p>
              </div>
            </>
          )}

          {activeTab === 'terms' && (
            <>
              <h2 className="text-sm font-bold text-zinc-150 uppercase flex items-center gap-2">
                <FileText className="text-zinc-400 w-4 h-4" /> SERVICE TERMS CONDITIONS
              </h2>
              <p>
                By signing into this terminal system using Google or entering score parameters, you fully confirm absolute adherence to core guidelines.
              </p>
              <div>
                <h3 className="font-bold text-zinc-200 uppercase mb-1">1. ACCOUNT SECURITY</h3>
                <p>
                  You are solely responsible for protecting your credentials. Injecting mock requests, manipulating scoreboards telemetry, or utilizing bots is strictly forbidden.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-zinc-200 uppercase mb-1">2. INTERACTION ETIQUETTE</h3>
                <p>
                  Pilot reviews and comments must remain polite and professional. Refrain from toxic speech or malware payload injections.
                </p>
              </div>
            </>
          )}

          {activeTab === 'cookies' && (
            <>
              <h2 className="text-sm font-bold text-zinc-150 uppercase flex items-center gap-2">
                <HelpCircle className="text-blue-400 w-4 h-4" /> GOOGLE CONSENT MODE V2 COMPLIANCE
              </h2>
              <p>
                We strictly integrate the latest Google Consent Mode v2 standard. Your choices map to specific storage permissions:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong className="text-zinc-300">necessary_storage:</strong> Enabled automatically to preserve cookie-consent memory, login states, and prevent cheat scores on leaderboards.</li>
                <li><strong className="text-zinc-300">analytics_storage:</strong> Collects anonymized screen resolutions, frame counters, and gameplay loops to debug canvas render lag.</li>
                <li><strong className="text-zinc-300">ad_storage &amp; ad_personalization:</strong> Governs tailored game marketing campaigns.</li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
