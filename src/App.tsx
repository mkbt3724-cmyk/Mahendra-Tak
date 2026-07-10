/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, LogIn, X, CheckCircle, Info } from 'lucide-react';
import { UserProfile } from './types';
import { registerOrLoginUser, getUserProfile, seedDatabaseIfNeeded } from './lib/dbHelper';
import { auth, logAnalyticsEvent } from './lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';

// Pages
import Home from './pages/Home';
import Games from './pages/Games';
import GameDetails from './pages/GameDetails';
import Leaderboard from './pages/Leaderboard';
import Achievements from './pages/Achievements';
import Blog from './pages/Blog';
import BlogArticle from './pages/BlogArticle';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import About from './pages/About';
import Contact from './pages/Contact';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  const [user, setUser] = useState<UserProfile | null>(null);

  // Maintenance mode detection
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Authentication Dialog State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Notification Toast States
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    msg: string;
    type: 'success' | 'info';
  }>({ show: false, title: '', msg: '', type: 'success' });

  // Real Firebase Auth observer & Maintenance check
  useEffect(() => {
    // Seed Firestore catalog collections on boot if empty (non-blocking)
    seedDatabaseIfNeeded().catch(err => console.error('Seeding catalog failed:', err));

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const dbProf = await getUserProfile(firebaseUser.uid);
          if (dbProf) {
            setUser(dbProf);
            localStorage.setItem('gameverse_user_session', JSON.stringify(dbProf));
          } else {
            // Self-Registration fallback in Firestore if Auth has user but DB record is missing
            const emailLower = (firebaseUser.email || '').toLowerCase().trim();
            const isSystemAdmin = emailLower === 'mkbt3724@gmail.com';
            const randSeed = Math.floor(Math.random() * 1000);
            const displayName = firebaseUser.displayName || emailLower.split('@')[0] || `User_${randSeed}`;
            const photoURL = firebaseUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(displayName)}`;

            const profilePayload = {
              uid: firebaseUser.uid,
              email: emailLower,
              displayName,
              photoURL,
              role: (isSystemAdmin ? 'admin' : 'user') as 'admin' | 'user',
              rank: isSystemAdmin ? 'Master Oracle' : 'Bronze Recruit',
              createdAt: new Date().toISOString(),
            };

            const finalProfile = await registerOrLoginUser(profilePayload);
            setUser(finalProfile);
            localStorage.setItem('gameverse_user_session', JSON.stringify(finalProfile));
          }
        } catch (err) {
          console.error('Error syncing auth profile:', err);
        }
      } else {
        setUser(null);
        localStorage.removeItem('gameverse_user_session');
      }
    });

    const isMaint = localStorage.getItem('gameverse_maintenance_mode') === 'true';
    setIsMaintenance(isMaint);

    return () => unsubscribe();
  }, []);

  const handleNavigate = (page: string, params: Record<string, any> = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Live sync maintenance state on every click
    const isMaint = localStorage.getItem('gameverse_maintenance_mode') === 'true';
    setIsMaintenance(isMaint);

    // Track page view event in Google Analytics
    logAnalyticsEvent('page_view', {
      page_title: page,
      page_path: `/${page}`,
      page_location: window.location.origin + '/' + page,
      ...(params.id ? { item_id: params.id } : {}),
      ...(params.category ? { item_category: params.category } : {}),
    });
  };

  const handleShowNotification = (title: string, msg: string, type: 'success' | 'info') => {
    setNotification({ show: true, title, msg, type });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  const handleBypassToSandbox = () => {
    const handleClean = loginName.trim() || 'Cadet_Sandbox';
    const emailLower = (loginEmail || 'sandbox@gameverse.com').toLowerCase().trim();
    const isSystemAdmin = emailLower === 'mkbt3724@gmail.com';
    const randSeed = Math.floor(Math.random() * 1000);
    const photoURL = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(handleClean || randSeed)}`;

    const profilePayload: UserProfile = {
      uid: 'sandbox_user_' + Date.now(),
      email: emailLower,
      displayName: handleClean,
      photoURL,
      role: (isSystemAdmin ? 'admin' : 'user') as 'admin' | 'user',
      rank: isSystemAdmin ? 'Master Oracle' : 'Bronze Recruit (Sandbox)',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: 'active',
      bio: 'Running in Local Sandbox Mode!',
      motto: 'Play • Compete • Win (Sandbox)',
      points: 100,
      isSandbox: true,
    };

    setUser(profilePayload);
    localStorage.setItem('gameverse_user_session', JSON.stringify(profilePayload));

    setShowLoginModal(false);
    setLoginEmail('');
    setLoginPassword('');
    setLoginName('');
    setAuthError('');

    // Track Sandbox Login in Google Analytics
    logAnalyticsEvent('login', {
      method: 'Sandbox',
      user_name: handleClean,
      user_role: profilePayload.role,
    });

    handleShowNotification(
      'Sandbox Mode Activated! ⚡',
      `Welcome, ${handleClean}! You have bypassed auth. Secure actions will simulate database synchronization.`,
      'info'
    );
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const emailClean = loginEmail.toLowerCase().trim();
    if (!emailClean) {
      setAuthError('Email address is required.');
      setIsAuthLoading(false);
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      setIsAuthLoading(false);
      return;
    }

    try {
      if (isRegisterMode) {
        // --- REGISTRATION FLOW ---
        const handleClean = loginName.trim();
        if (!handleClean) {
          setAuthError('Player handle name is required.');
          setIsAuthLoading(false);
          return;
        }

        // 1. Create firebase user auth credential
        const cred = await createUserWithEmailAndPassword(auth, emailClean, loginPassword);
        const firebaseUser = cred.user;

        // 2. Set Profile fields
        const isSystemAdmin = emailClean === 'mkbt3724@gmail.com';
        const randSeed = Math.floor(Math.random() * 1000);
        const photoURL = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(handleClean || randSeed)}`;

        await updateProfile(firebaseUser, {
          displayName: handleClean,
          photoURL,
        });

        // 3. Create document in firestore (will be fetched/completed via state change)
        const profilePayload = {
          uid: firebaseUser.uid,
          email: emailClean,
          displayName: handleClean,
          photoURL,
          role: (isSystemAdmin ? 'admin' : 'user') as 'admin' | 'user',
          rank: isSystemAdmin ? 'Master Oracle' : 'Bronze Recruit',
          createdAt: new Date().toISOString(),
        };

        const finalProfile = await registerOrLoginUser(profilePayload);
        setUser(finalProfile);
        localStorage.setItem('gameverse_user_session', JSON.stringify(finalProfile));

        // Track user registration in Google Analytics
        logAnalyticsEvent('sign_up', {
          method: 'EmailPassword',
          user_name: handleClean,
          user_role: finalProfile.role,
        });

        handleShowNotification(
          'Registration Successful! 🚀',
          `Welcome, player ${handleClean}! Ready to sweep malware and post scores!`,
          'success'
        );
      } else {
        // --- SIGN IN FLOW ---
        const cred = await signInWithEmailAndPassword(auth, emailClean, loginPassword);
        const firebaseUser = cred.user;

        // Fetch current Firestore Profile to verify syncing
        const dbProf = await getUserProfile(firebaseUser.uid);
        if (dbProf) {
          setUser(dbProf);
          localStorage.setItem('gameverse_user_session', JSON.stringify(dbProf));

          // Track successful login in Google Analytics
          logAnalyticsEvent('login', {
            method: 'EmailPassword',
            user_name: dbProf.displayName,
            user_role: dbProf.role,
          });
        }

        handleShowNotification(
          'Authentication Verified! 🎮',
          `Authorized access as ${firebaseUser.displayName || 'cadet'}! Welcome back.`,
          'success'
        );
      }

      // Reset Form State on success
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
      setLoginName('');
      setAuthError('');
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let errMsg = err?.message || 'Authentication failed. Please verify credentials.';
      if (err?.code === 'auth/email-already-in-use') {
        errMsg = 'The email address is already in use by another gamer.';
      } else if (err?.code === 'auth/invalid-email') {
        errMsg = 'Invalid email address format.';
      } else if (err?.code === 'auth/weak-password') {
        errMsg = 'The chosen password is too weak (minimum 6 characters required).';
      } else if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        errMsg = 'Invalid email address or security key combo.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        errMsg = "Email/Password sign-in provider is disabled in your Firebase project! Please open your Firebase Console > Authentication > Sign-in method tab, and enable the 'Email/Password' provider. Auto-bypassing to Sandbox Mode in 2 seconds...";
        // Automatically activate local Sandbox mode so user doesn't get blocked
        setTimeout(() => {
          handleBypassToSandbox();
        }, 2000);
      }
      setAuthError(errMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }

    // Track user logout in Google Analytics before clearing state
    if (user) {
      logAnalyticsEvent('logout', {
        user_name: user.displayName,
        user_role: user.role,
      });
    }

    setUser(null);
    localStorage.removeItem('gameverse_user_session');
    handleNavigate('home');
    handleShowNotification('Profile Disconnected ⚡', 'Session terminated. Scoreboards are locked in view-only parameters.', 'info');
  };

  const reloadProfile = async () => {
    if (!user) return;
    const dbProf = await getUserProfile(user.uid);
    if (dbProf) {
      setUser(dbProf);
      localStorage.setItem('gameverse_user_session', JSON.stringify(dbProf));
    }
  };

  // Check Maintenance Lockout (Admins bypass)
  const isLockedOut = isMaintenance && (!user || user.role !== 'admin');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-blue-600 selection:text-white">
      {isLockedOut ? (
        /* Maintenance page overlay */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center font-mono text-xs max-w-md mx-auto my-auto">
          <AlertTriangle className="text-red-500 w-16 h-16 mb-4 animate-bounce" />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">MAINTENANCE RESTRICTION</h1>
          <p className="text-zinc-500 leading-relaxed mb-6 uppercase">
            GameVerse central cores are currently undergoing synchronization. Access is restricted to admin pilots only.
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <LogIn size={14} />
            <span>ADMIN LOG IN</span>
          </button>
        </div>
      ) : (
        /* Standard App Shell */
        <>
          {/* Header Navbar */}
          <Navbar
            user={user}
            onNavigate={handleNavigate}
            currentPage={currentPage}
            onLogout={handleLogout}
            onTriggerLogin={() => setShowLoginModal(true)}
          />

          {/* Page Routing Switchboard */}
          <main className="flex-1 w-full flex flex-col">
            {currentPage === 'home' && (
              <Home
                user={user}
                onNavigate={handleNavigate}
                onTriggerLogin={() => setShowLoginModal(true)}
                onShowNotification={handleShowNotification}
              />
            )}
            {currentPage === 'games' && (
              <Games onNavigate={handleNavigate} initialParams={pageParams} />
            )}
            {currentPage === 'game-details' && (
              <GameDetails
                gameId={pageParams.id || 'space-shooter'}
                user={user}
                onNavigate={handleNavigate}
                onShowNotification={handleShowNotification}
                onTriggerLogin={() => setShowLoginModal(true)}
              />
            )}
            {currentPage === 'leaderboard' && <Leaderboard />}
            {currentPage === 'achievements' && <Achievements user={user} />}
            {currentPage === 'blog' && <Blog onNavigate={handleNavigate} />}
            {currentPage === 'blog-article' && (
              <BlogArticle
                blogId={pageParams.id || 'launch-post'}
                user={user}
                onNavigate={handleNavigate}
                onTriggerLogin={() => setShowLoginModal(true)}
                onShowNotification={handleShowNotification}
              />
            )}
            {currentPage === 'profile' && (
              <Profile
                user={user}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                onShowNotification={handleShowNotification}
                onProfileUpdated={reloadProfile}
              />
            )}
            {currentPage === 'admin' && (
              <Admin
                user={user}
                onNavigate={handleNavigate}
                onShowNotification={handleShowNotification}
              />
            )}
            {currentPage === 'about' && <About />}
            {currentPage === 'contact' && (
              <Contact onShowNotification={handleShowNotification} />
            )}
            {currentPage === 'privacy' && <Legal />}
            {currentPage === 'cookies' && <Legal />}
            {currentPage === 'terms' && <Legal />}
            {!['home', 'games', 'game-details', 'leaderboard', 'achievements', 'blog', 'blog-article', 'profile', 'admin', 'about', 'contact', 'privacy', 'cookies', 'terms'].includes(currentPage) && (
              <NotFound onNavigate={handleNavigate} />
            )}
          </main>

          {/* Footer Navigation */}
          <Footer onNavigate={handleNavigate} onShowNotification={handleShowNotification} />

          {/* Cookies banner */}
          <CookieBanner />
        </>
      )}

      {/* Interactive Verification Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <form
            onSubmit={handleLoginSubmit}
            className="w-full max-w-sm bg-zinc-950 border border-blue-500/25 rounded-3xl p-6 relative font-mono text-xs text-left"
          >
            <button
              type="button"
              onClick={() => {
                setShowLoginModal(false);
                setAuthError('');
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-bold text-zinc-100 uppercase mb-3 flex items-center gap-2">
              <LogIn className="text-blue-500" size={16} />
              AUTHENTICATION CHECKPOINT
            </h3>

            {/* Mode Switch Tabs */}
            <div className="flex border-b border-zinc-900 pb-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setAuthError('');
                }}
                className={`flex-1 pb-1 text-center text-[10px] font-black tracking-widest transition-colors cursor-pointer ${
                  !isRegisterMode ? 'text-blue-500 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-350'
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setAuthError('');
                }}
                className={`flex-1 pb-1 text-center text-[10px] font-black tracking-widest transition-colors cursor-pointer ${
                  isRegisterMode ? 'text-blue-500 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-350'
                }`}
              >
                REGISTER
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-4 p-3.5 bg-red-950/40 border border-red-500/25 rounded-2xl text-[10px] text-red-400 leading-normal uppercase flex flex-col gap-3">
                <div className="font-semibold">{authError}</div>
                {authError.toLowerCase().includes('disabled') && (
                  <button
                    type="button"
                    onClick={handleBypassToSandbox}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black tracking-widest uppercase rounded-xl transition duration-200 active:scale-95 shadow-md shadow-blue-600/15 cursor-pointer text-center"
                  >
                    🚀 Bypassing... Play in Sandbox Mode
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-550 uppercase font-bold">Secure Cadet Email</label>
                <input
                  type="email"
                  required
                  placeholder="pilot@gameverse.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none px-3.5 py-2.5 rounded-xl text-zinc-200"
                />
                <span className="text-[9px] text-zinc-600 uppercase">Input "mkbt3724@gmail.com" for administrative access.</span>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-550 uppercase font-bold">Secret Passphrase Key</label>
                <input
                  type="password"
                  required
                  placeholder="******"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none px-3.5 py-2.5 rounded-xl text-zinc-200"
                />
              </div>

              {/* Name (Only in Register Mode) */}
              {isRegisterMode && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-[10px] text-zinc-550 uppercase font-bold">Player Name / Handle</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NeoGamerX"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none px-3.5 py-2.5 rounded-xl text-zinc-200"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="mt-2.5 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-bold rounded-xl tracking-wider uppercase transition text-center shadow-lg shadow-blue-600/25 cursor-pointer active:scale-95"
              >
                {isAuthLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                    VERIFYING...
                  </span>
                ) : (
                  isRegisterMode ? 'INITIALIZE SIGNATURE' : 'VERIFY SIGNATURE'
                )}
              </button>

              <button
                type="button"
                onClick={handleBypassToSandbox}
                className="text-center text-[9px] font-bold text-zinc-500 hover:text-blue-400 uppercase tracking-widest transition cursor-pointer mt-1"
              >
                ⚡ OR ENTER SIMULATED SANDBOX MODE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dynamic Toast notifications overlay */}
      {notification.show && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-zinc-950 border border-zinc-900 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-fade-in font-sans text-left">
          {notification.type === 'success' ? (
            <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
          ) : (
            <Info className="text-blue-500 w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
          )}
          <div className="flex-1">
            <h5 className="font-bold text-xs text-zinc-100 uppercase font-mono">{notification.title}</h5>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-mono">{notification.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
