/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  Shield,
  Menu,
  X,
  Check,
  Trash2,
  LogIn,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} from '../lib/dbHelper';
import { UserProfile, NotificationItem } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  onNavigate: (page: string, params?: Record<string, any>) => void;
  currentPage: string;
  onLogout: () => void;
  onTriggerLogin: () => void;
}

export default function Navbar({
  user,
  onNavigate,
  currentPage,
  onLogout,
  onTriggerLogin,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Fetch real-time notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchNotifs = async () => {
      const list = await getNotifications(user.uid);
      setNotifications(list);
    };

    fetchNotifs();
    // Poll notifications every 10 seconds for real-time emulation
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Click Outside hooks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleDeleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('games', { search: searchQuery });
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { id: 'home', label: 'HOME' },
    { id: 'games', label: 'GAMES' },
    { id: 'leaderboard', label: 'LEADERBOARD' },
    { id: 'achievements', label: 'ACHIEVEMENTS' },
    { id: 'blog', label: 'BLOG' },
    { id: 'about', label: 'ABOUT' },
    { id: 'contact', label: 'CONTACT' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-black/85 backdrop-blur-md border-b border-zinc-900 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-white font-black tracking-widest text-xl cursor-pointer select-none"
        >
          <Gamepad2 className="text-blue-500 w-6 h-6 rotate-12 transition-transform hover:rotate-45" />
          <span>GAME<span className="text-blue-500">VERSE</span></span>
        </div>

        {/* Desktop Navigation Links */}
        <ul className="hidden lg:flex items-center gap-8 text-xs font-bold tracking-widest text-zinc-400 font-mono">
          {navLinks.map((link) => (
            <li key={link.id}>
              <button
                onClick={() => onNavigate(link.id)}
                className={`hover:text-blue-400 transition-colors uppercase cursor-pointer ${
                  currentPage === link.id ? 'text-blue-500 border-b-2 border-blue-500 pb-1' : ''
                }`}
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Live Search and controls */}
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative max-w-[200px]">
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs font-mono pl-8 pr-3 py-2 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-full"
            />
            <Search size={14} className="absolute left-2.5 text-zinc-500" />
          </form>

          {/* Notifications Center */}
          {user && (
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="text-zinc-400 hover:text-white p-2 bg-zinc-900/60 border border-zinc-850 rounded-xl transition cursor-pointer relative"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                )}
              </button>

              {/* Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl p-4 z-50 text-white animate-fade-in font-sans">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                    <span className="text-xs font-bold font-mono tracking-widest">NOTIFICATIONS ({unreadCount})</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-zinc-600 font-mono">
                      CLEAN LOGS. NO RECENT ALERTS.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-xl border flex flex-col gap-1 transition ${
                            notif.read ? 'bg-zinc-900/20 border-zinc-900 text-zinc-500' : 'bg-zinc-900 border-blue-900/30 text-zinc-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs">{notif.title}</span>
                            <div className="flex gap-1.5">
                              {!notif.read && (
                                <button
                                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                                  className="text-blue-400 hover:text-blue-300 p-0.5 transition"
                                  title="Mark Read"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDeleteNotif(notif.id, e)}
                                className="text-zinc-500 hover:text-red-400 p-0.5 transition"
                                title="Dismiss"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] leading-relaxed text-zinc-400">{notif.message}</p>
                          <span className="text-[9px] text-zinc-650 font-mono mt-0.5 align-right">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User profile dropdown trigger */}
          {user ? (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 text-left hover:opacity-90 transition cursor-pointer"
              >
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-9 h-9 rounded-xl border border-blue-500/20 object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>

              {/* Profile Dropdown popover */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl p-3 z-50 text-white animate-fade-in font-mono text-xs">
                  <div className="border-b border-zinc-900 pb-2.5 mb-2 px-1">
                    <div className="font-bold text-zinc-200 truncate">{user.displayName}</div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">{user.email}</div>
                    <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded text-[9px] font-bold mt-1.5 uppercase">
                      {user.role} badge
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left p-2 hover:bg-zinc-900 hover:text-blue-400 rounded-xl flex items-center gap-2 transition"
                    >
                      <User size={14} />
                      <span>My Profile</span>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          onNavigate('admin');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left p-2 hover:bg-zinc-900 hover:text-emerald-400 rounded-xl flex items-center gap-2 text-emerald-400/90 transition"
                      >
                        <Shield size={14} />
                        <span>Admin Terminal</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onLogout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left p-2 hover:bg-zinc-900 hover:text-red-400 rounded-xl flex items-center gap-2 text-zinc-500 transition mt-1 border-t border-zinc-900/60 pt-2"
                    >
                      <LogOut size={14} />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onTriggerLogin}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs tracking-wider rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <LogIn size={13} />
              <span>LOGIN</span>
            </button>
          )}

          {/* Mobile Menu Toggle button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-zinc-400 hover:text-white p-2 bg-zinc-900/60 border border-zinc-850 rounded-xl transition cursor-pointer"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-4 pt-4 border-t border-zinc-900 flex flex-col gap-3 font-mono text-xs font-bold text-zinc-400">
          <form onSubmit={handleSearchSubmit} className="flex relative w-full mb-2">
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs w-full pl-8 pr-3 py-2 rounded-xl text-zinc-250 focus:outline-none"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
          </form>

          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                onNavigate(link.id);
                setMobileMenuOpen(false);
              }}
              className={`text-left p-2 rounded-xl transition-colors uppercase ${
                currentPage === link.id ? 'bg-zinc-900 text-blue-400' : 'hover:bg-zinc-900/55'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
