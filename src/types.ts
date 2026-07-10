/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  developer: string;
  version: string;
  thumbnail: string;
  banner?: string;
  rating: number;
  reviewsCount?: number;
  playersCount: number;
  releaseDate: string;
  featured: boolean;
  status?: 'published' | 'draft';
  seoSlug?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio?: string;
  motto?: string;
  country?: string;
  language?: string;
  themePreference?: 'dark' | 'light';
  notificationsEnabled?: boolean;
  marketingConsent?: boolean;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'suspended';
  rank?: string;
  points?: number;
  isSandbox?: boolean;
}

export interface Review {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface LeaderboardEntry {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  score: number;
  achievementsCount: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  gameId?: string; // Optional if global
  points: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'all' for broadcast
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  authorName: string;
  authorAvatar: string;
  coverImage: string;
  createdAt: string;
  status: 'published' | 'draft';
  seoSlug: string;
  views: number;
  likes: number;
}

export interface BlogComment {
  id: string;
  blogId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  commentText: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  type: 'contact' | 'feedback' | 'bug_report';
  status: 'unread' | 'read' | 'replied';
  createdAt: string;
}

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  userId?: string;
  params: Record<string, any>;
  timestamp: string;
}

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
  advertising: boolean;
  personalization: boolean;
  updatedAt: string;
}

export interface SiteSettings {
  id: string;
  websiteName: string;
  tagline: string;
  themePrimaryColor: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  ga4MeasurementId: string;
  gtmContainerId: string;
  searchConsoleVerification: string;
}
