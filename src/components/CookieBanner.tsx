/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Settings, Check } from 'lucide-react';
import { ConsentPreferences } from '../types';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: true,
    functional: true,
    advertising: false,
    personalization: false,
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    const savedConsent = localStorage.getItem('gameverse_cookie_consent');
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        // Apply GTM Consent states if needed
        applyConsentSignals(parsed);
      } catch (e) {
        setShowBanner(true);
      }
    }
  }, []);

  const applyConsentSignals = (prefs: ConsentPreferences) => {
    // Standard Google Consent Mode v2 signals
    if (typeof window !== 'undefined') {
      const gtag = (window as any).gtag || function () { (window as any).dataLayer?.push(arguments); };
      gtag('consent', 'update', {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.advertising ? 'granted' : 'denied',
        ad_user_data: prefs.advertising ? 'granted' : 'denied',
        ad_personalization: prefs.advertising ? 'granted' : 'denied',
        functionality_storage: prefs.functional ? 'granted' : 'denied',
        personalization_storage: prefs.personalization ? 'granted' : 'denied',
        security_storage: 'granted', // Always necessary
      });
      console.log('Google Consent Mode v2 Signals Sent:', prefs);
    }
  };

  const handleAcceptAll = () => {
    const allPrefs: ConsentPreferences = {
      necessary: true,
      analytics: true,
      functional: true,
      advertising: true,
      personalization: true,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('gameverse_cookie_consent', JSON.stringify(allPrefs));
    applyConsentSignals(allPrefs);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const minPrefs: ConsentPreferences = {
      necessary: true,
      analytics: false,
      functional: false,
      advertising: false,
      personalization: false,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('gameverse_cookie_consent', JSON.stringify(minPrefs));
    applyConsentSignals(minPrefs);
    setShowBanner(false);
  };

  const handleSaveCustom = () => {
    const customPrefs = {
      ...preferences,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('gameverse_cookie_consent', JSON.stringify(customPrefs));
    applyConsentSignals(customPrefs);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-5 left-5 right-5 md:left-auto md:max-w-md bg-zinc-950 border border-blue-500/30 rounded-2xl p-5 shadow-2xl z-50 text-white animate-fade-in font-sans">
      <div className="flex items-start gap-4">
        <div className="bg-blue-600/15 p-3 rounded-xl text-blue-400 border border-blue-500/25 shrink-0">
          <ShieldCheck size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm tracking-wide text-zinc-100">DATA & PRIVACY PREFERENCES</h4>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
            GameVerse uses essential and analytical tracking cookies to stabilize live leaderboard latency, optimize gaming visuals, and deliver tailored AI recommendations.
          </p>

          {!showConfig ? (
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold tracking-wide transition active:scale-95"
                >
                  Accept All
                </button>
                <button
                  onClick={handleRejectAll}
                  className="flex-1 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-800 transition"
                >
                  Reject All
                </button>
              </div>
              <button
                onClick={() => setShowConfig(true)}
                className="w-full text-center text-blue-400 hover:text-blue-300 text-[10px] uppercase tracking-wider font-semibold font-mono mt-1"
              >
                Customize Cookie Preferences
              </button>
            </div>
          ) : (
            <div className="mt-4 border-t border-zinc-900 pt-3 flex flex-col gap-2.5">
              {/* Necessary */}
              <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded-lg border border-zinc-850">
                <div>
                  <div className="text-xs font-bold">Necessary</div>
                  <div className="text-[9px] text-zinc-500">Authentication & leaderboard integrity</div>
                </div>
                <span className="text-blue-400 text-xs font-mono font-bold uppercase">REQUIRED</span>
              </div>

              {/* Analytics */}
              <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded-lg border border-zinc-850">
                <div>
                  <div className="text-xs font-bold">Analytics</div>
                  <div className="text-[9px] text-zinc-500">Real-time visitor telemetry & heatmaps</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Functional */}
              <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded-lg border border-zinc-850">
                <div>
                  <div className="text-xs font-bold">Functional</div>
                  <div className="text-[9px] text-zinc-500">Sound preferences & offline sync cache</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                  className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Advertising */}
              <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded-lg border border-zinc-850">
                <div>
                  <div className="text-xs font-bold">Advertising & Custom Ads</div>
                  <div className="text-[9px] text-zinc-500">Tailored banner integrations</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.advertising}
                  onChange={(e) => setPreferences({ ...preferences, advertising: e.target.checked })}
                  className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveCustom}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold tracking-wide transition"
                >
                  Save Preferences
                </button>
                <button
                  onClick={() => setShowConfig(false)}
                  className="px-3 py-2 bg-zinc-900 text-zinc-400 hover:text-zinc-300 rounded-lg text-xs border border-zinc-800 transition"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
