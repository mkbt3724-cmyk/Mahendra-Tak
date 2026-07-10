/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Game,
  BlogPost,
  UserProfile,
  Review,
  LeaderboardEntry,
  UserAchievement,
  NotificationItem,
  BlogComment,
  ContactMessage,
} from '../types';
import {
  INITIAL_GAMES,
  INITIAL_BLOGS,
} from '../data/initialData';

// Constants for Collection names
const GAMES_COLL = 'games';
const BLOGS_COLL = 'blogs';
const USERS_COLL = 'users';
const REVIEWS_COLL = 'reviews';
const LEADERBOARD_COLL = 'leaderboard';
const ACHIEVEMENTS_COLL = 'user_achievements';
const NOTIFICATIONS_COLL = 'notifications';
const COMMENTS_COLL = 'blog_comments';
const CONTACTS_COLL = 'contacts';
const LOGS_COLL = 'system_logs';

// Local runtime caches to speed up page loading dramatically
let cachedGames: Game[] | null = null;
let cachedBlogs: BlogPost[] | null = null;

/**
 * Log actions to Firestore for Admin & security audit trails
 */
export async function logSystemEvent(
  userId: string,
  userName: string,
  action: string,
  details: string,
  status: 'success' | 'failed' = 'success'
) {
  try {
    await addDoc(collection(db, LOGS_COLL), {
      userId,
      userName,
      action,
      details,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Logging system event failed:', err);
  }
}

/**
 * Initialize Firestore with default data if empty
 */
export async function seedDatabaseIfNeeded() {
  try {
    // Check if we already seeded in this browser session
    if (localStorage.getItem('gameverse_db_seeded_v4') === 'true') {
      return;
    }

    // Check and seed each game individually to ensure new games (Grid Armada, Cyber Serpent) are added automatically!
    for (const game of INITIAL_GAMES) {
      const gameRef = doc(db, GAMES_COLL, game.id);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        await setDoc(gameRef, game);
        console.log(`Seeded game: ${game.title}`);
      }
    }

    // Check and seed each blog individually
    for (const blog of INITIAL_BLOGS) {
      const blogRef = doc(db, BLOGS_COLL, blog.id);
      const blogSnap = await getDoc(blogRef);
      if (!blogSnap.exists()) {
        await setDoc(blogRef, blog);
        console.log(`Seeded blog: ${blog.title}`);
      }
    }

    // Reset caches so they fetch fresh data
    cachedGames = null;
    cachedBlogs = null;

    localStorage.setItem('gameverse_db_seeded_v4', 'true');
  } catch (err: any) {
    // Graceful offline fallback: populate catalog caches with initial data so that they are instantly available
    cachedGames = INITIAL_GAMES;
    cachedBlogs = INITIAL_BLOGS;
    console.warn(
      '[Offline Mode] Firestore seeding was skipped (client offline or not configured yet). Activated local memory cache.',
      err?.message || err
    );
  }
}

/**
 * Register or login user profile
 */
export async function registerOrLoginUser(payload: {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  rank: string;
  createdAt: string;
  isSandbox?: boolean;
}): Promise<UserProfile> {
  if (payload.isSandbox) {
    return {
      ...payload,
      bio: 'Ready to play (Sandbox Mode)!',
      motto: 'Play • Compete • Win (Sandbox)',
      lastLogin: new Date().toISOString(),
      status: 'active',
      points: 100,
    };
  }

  const userRef = doc(db, USERS_COLL, payload.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const existing = snap.data() as UserProfile;
    // Update last login timestamp
    await updateDoc(userRef, { lastLogin: new Date().toISOString() });
    return {
      ...existing,
      lastLogin: new Date().toISOString(),
    };
  } else {
    const newUser: UserProfile = {
      ...payload,
      bio: 'Ready to play!',
      motto: 'Play • Compete • Win',
      lastLogin: new Date().toISOString(),
      status: 'active',
      points: 100, // Initial points
    };
    await setDoc(userRef, newUser);

    // Initial welcome notification
    await addDoc(collection(db, NOTIFICATIONS_COLL), {
      userId: payload.uid,
      title: 'Welcome Cadet! 🚀',
      message: 'Launch space battles, sweep malware, and register scores!',
      read: false,
      createdAt: new Date().toISOString(),
    });

    await logSystemEvent(payload.uid, payload.displayName, 'REGISTER', `User logged in first time: ${payload.email}`);
    return newUser;
  }
}

/**
 * Get User Profile
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLL, uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    console.error('get user profile failed:', err);
    return null;
  }
}

/**
 * Update User Profile
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, USERS_COLL, uid);
  await updateDoc(userRef, data);
}

/**
 * Delete User Profile and associated user logs
 */
export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLL, uid));
}

/**
 * Games Catalog Operations
 */
export async function getGames(): Promise<Game[]> {
  if (cachedGames && cachedGames.length > 0) {
    return cachedGames;
  }
  try {
    const snap = await getDocs(collection(db, GAMES_COLL));
    if (snap.empty) {
      cachedGames = INITIAL_GAMES;
      return INITIAL_GAMES;
    }
    const list = snap.docs.map((d) => d.data() as Game);
    cachedGames = list;
    return list;
  } catch (err) {
    console.error(err);
    cachedGames = INITIAL_GAMES;
    return INITIAL_GAMES;
  }
}

export async function getGameById(id: string): Promise<Game | null> {
  // If we already have cachedGames, try to read from it first (super fast local read)
  if (cachedGames) {
    const found = cachedGames.find((g) => g.id === id);
    if (found) return found;
  }
  try {
    const docRef = doc(db, GAMES_COLL, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Game;
    }
    return INITIAL_GAMES.find((g) => g.id === id) || null;
  } catch (err) {
    console.error(err);
    return INITIAL_GAMES.find((g) => g.id === id) || null;
  }
}

export async function createGame(game: Game): Promise<void> {
  await setDoc(doc(db, GAMES_COLL, game.id), game);
  cachedGames = null; // Invalidate cache
}

export async function updateGame(gameId: string, payload: Partial<Game>): Promise<void> {
  const ref = doc(db, GAMES_COLL, gameId);
  await updateDoc(ref, payload);
  cachedGames = null; // Invalidate cache
}

export async function deleteGame(gameId: string): Promise<void> {
  await deleteDoc(doc(db, GAMES_COLL, gameId));
  cachedGames = null; // Invalidate cache
}

/**
 * Reviews & Comments Operations
 */
export async function getReviewsForGame(gameId: string): Promise<Review[]> {
  let list: Review[] = [];
  try {
    const snap = await getDocs(collection(db, REVIEWS_COLL));
    list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Review))
      .filter((r) => r.gameId === gameId && r.status === 'approved');
  } catch (err) {
    console.error(err);
  }

  // Merge with local sandbox reviews
  try {
    const stored = localStorage.getItem(`gameverse_local_reviews_${gameId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as Review[];
      list = [...list, ...parsed];
    }
  } catch (_) {}

  return list;
}

export async function submitReview(review: Omit<Review, 'id' | 'status'>): Promise<void> {
  const localSession = localStorage.getItem('gameverse_user_session');
  let isSandbox = false;
  if (localSession) {
    try {
      const parsed = JSON.parse(localSession) as UserProfile;
      isSandbox = !!parsed.isSandbox;
    } catch (_) {}
  }

  if (isSandbox) {
    try {
      const stored = localStorage.getItem(`gameverse_local_reviews_${review.gameId}`) || '[]';
      const parsed = JSON.parse(stored) as Review[];
      parsed.push({
        id: 'local_rev_' + Date.now(),
        ...review,
        status: 'approved',
      });
      localStorage.setItem(`gameverse_local_reviews_${review.gameId}`, JSON.stringify(parsed));
    } catch (_) {}
    return;
  }

  const collRef = collection(db, REVIEWS_COLL);
  await addDoc(collRef, {
    ...review,
    status: 'pending', // Requires admin approval!
  });
}

export async function getPendingReviews(): Promise<Review[]> {
  try {
    const snap = await getDocs(collection(db, REVIEWS_COLL));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Review))
      .filter((r) => r.status === 'pending');
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function approveReview(reviewId: string): Promise<void> {
  const ref = doc(db, REVIEWS_COLL, reviewId);
  await updateDoc(ref, { status: 'approved' });

  // Recalculate game rating
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const rev = snap.data() as Review;
    const gameRef = doc(db, GAMES_COLL, rev.gameId);
    const gSnap = await getDoc(gameRef);
    if (gSnap.exists()) {
      const g = gSnap.data() as Game;
      const prevCount = g.playersCount || 0;
      const prevRating = g.rating || 5;
      const newRating = parseFloat(((prevRating * prevCount + rev.rating) / (prevCount + 1)).toFixed(1));
      await updateDoc(gameRef, { rating: newRating });
    }
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  await deleteDoc(doc(db, REVIEWS_COLL, reviewId));
}

/**
 * Scoreboard Leaderboard Operations
 */
export async function getLeaderboard(gameId: string, limitCount = 10): Promise<LeaderboardEntry[]> {
  let list: LeaderboardEntry[] = [];
  try {
    const snap = await getDocs(collection(db, LEADERBOARD_COLL));
    list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as LeaderboardEntry))
      .filter((l) => l.gameId === gameId);
  } catch (err) {
    console.error(err);
  }

  // Merge with local sandbox scores
  try {
    const stored = localStorage.getItem(`gameverse_local_scores_${gameId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as LeaderboardEntry[];
      list = [...list, ...parsed];
    }
  } catch (_) {}

  return list
    .sort((a, b) => b.score - a.score)
    .slice(0, limitCount);
}

export async function submitScore(entry: Omit<LeaderboardEntry, 'id' | 'createdAt'>): Promise<void> {
  const localSession = localStorage.getItem('gameverse_user_session');
  let isSandbox = false;
  let userProfile: UserProfile | null = null;
  if (localSession) {
    try {
      userProfile = JSON.parse(localSession) as UserProfile;
      isSandbox = !!userProfile.isSandbox;
    } catch (_) {}
  }

  if (isSandbox) {
    try {
      const stored = localStorage.getItem(`gameverse_local_scores_${entry.gameId}`) || '[]';
      const parsed = JSON.parse(stored) as LeaderboardEntry[];
      const newEntry: LeaderboardEntry = {
        id: 'local_score_' + Date.now(),
        ...entry,
        createdAt: new Date().toISOString(),
      };
      parsed.push(newEntry);
      localStorage.setItem(`gameverse_local_scores_${entry.gameId}`, JSON.stringify(parsed));

      // Boost local profile experience points in local storage directly
      if (userProfile) {
        const currentPoints = userProfile.points || 0;
        const increment = Math.round(entry.score / 10);
        const nextPoints = currentPoints + increment;

        let rank = 'Bronze Recruit';
        if (nextPoints >= 10000) rank = 'Master Oracle';
        else if (nextPoints >= 5000) rank = 'Platinum Elite';
        else if (nextPoints >= 2500) rank = 'Gold Commander';
        else if (nextPoints >= 1000) rank = 'Silver Specialist';

        const updatedProfile = {
          ...userProfile,
          points: nextPoints,
          rank,
        };
        localStorage.setItem('gameverse_user_session', JSON.stringify(updatedProfile));
      }
    } catch (err) {
      console.error('Error saving local sandbox score:', err);
    }
    return;
  }

  const collRef = collection(db, LEADERBOARD_COLL);
  await addDoc(collRef, {
    ...entry,
    createdAt: new Date().toISOString(),
  });

  // Boost User Gamer Experience points
  const userRef = doc(db, USERS_COLL, entry.userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const u = snap.data() as UserProfile;
    const currentPoints = u.points || 0;
    const increment = Math.round(entry.score / 10);
    const nextPoints = currentPoints + increment;

    let rank = 'Bronze Recruit';
    if (nextPoints >= 10000) rank = 'Master Oracle';
    else if (nextPoints >= 5000) rank = 'Platinum Elite';
    else if (nextPoints >= 2500) rank = 'Gold Commander';
    else if (nextPoints >= 1000) rank = 'Silver Specialist';

    await updateDoc(userRef, {
      points: nextPoints,
      rank,
    });
  }
}

export async function getUserScoreLogs(userId: string): Promise<LeaderboardEntry[]> {
  let list: LeaderboardEntry[] = [];
  try {
    const snap = await getDocs(collection(db, LEADERBOARD_COLL));
    list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as LeaderboardEntry))
      .filter((l) => l.userId === userId);
  } catch (err) {
    console.error(err);
  }

  // Merge local sandbox scores for all active games
  try {
    const activeGames = ['space-shooter', 'battleship', 'cyber-snake'];
    for (const gid of activeGames) {
      const stored = localStorage.getItem(`gameverse_local_scores_${gid}`);
      if (stored) {
        const parsed = JSON.parse(stored) as LeaderboardEntry[];
        list = [...list, ...parsed.filter((l) => l.userId === userId)];
      }
    }
  } catch (_) {}

  return list.sort((a, b) => b.score - a.score);
}

/**
 * Achievements System
 */
export async function getUnlockedAchievements(userId: string): Promise<string[]> {
  let list: string[] = [];
  try {
    const snap = await getDocs(collection(db, ACHIEVEMENTS_COLL));
    list = snap.docs
      .map((d) => d.data() as UserAchievement)
      .filter((a) => a.userId === userId)
      .map((a) => a.achievementId);
  } catch (err) {
    console.error(err);
  }

  // Merge with local sandbox achievements
  try {
    const stored = localStorage.getItem(`gameverse_local_achievements_${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      list = [...new Set([...list, ...parsed])];
    }
  } catch (_) {}

  return list;
}

export async function unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
  const localSession = localStorage.getItem('gameverse_user_session');
  let isSandbox = false;
  if (localSession) {
    try {
      const parsed = JSON.parse(localSession) as UserProfile;
      isSandbox = !!parsed.isSandbox;
    } catch (_) {}
  }

  if (isSandbox) {
    try {
      const key = `gameverse_local_achievements_${userId}`;
      const stored = localStorage.getItem(key) || '[]';
      const parsed = JSON.parse(stored) as string[];
      if (parsed.includes(achievementId)) return false;
      parsed.push(achievementId);
      localStorage.setItem(key, JSON.stringify(parsed));
      return true;
    } catch (_) {
      return false;
    }
  }

  try {
    const collRef = collection(db, ACHIEVEMENTS_COLL);
    const snap = await getDocs(collRef);
    const alreadyUnlocked = snap.docs.some(
      (d) => {
        const data = d.data() as UserAchievement;
        return data.userId === userId && data.achievementId === achievementId;
      }
    );

    if (alreadyUnlocked) return false;

    // Save unlock
    await addDoc(collRef, {
      userId,
      achievementId,
      unlockedAt: new Date().toISOString(),
    });

    // Send a notification alert to player
    await addDoc(collection(db, NOTIFICATIONS_COLL), {
      userId,
      title: 'Achievement Completed! 🏆',
      message: `Completed milestone: ${achievementId}. Experience increased!`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

/**
 * Notifications Centre
 */
export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const snap = await getDocs(collection(db, NOTIFICATIONS_COLL));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as NotificationItem))
      .filter((n) => n.userId === userId || n.userId === 'all')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  const ref = doc(db, NOTIFICATIONS_COLL, notifId);
  await updateDoc(ref, { read: true });
}

export async function deleteNotification(notifId: string): Promise<void> {
  await deleteDoc(doc(db, NOTIFICATIONS_COLL, notifId));
}

/**
 * Blogs & Bulletins Channels
 */
export async function getBlogs(): Promise<BlogPost[]> {
  if (cachedBlogs && cachedBlogs.length > 0) {
    return cachedBlogs;
  }
  try {
    const snap = await getDocs(collection(db, BLOGS_COLL));
    if (snap.empty) {
      cachedBlogs = INITIAL_BLOGS;
      return INITIAL_BLOGS;
    }
    const list = snap.docs.map((d) => d.data() as BlogPost);
    cachedBlogs = list;
    return list;
  } catch (err) {
    console.error(err);
    cachedBlogs = INITIAL_BLOGS;
    return INITIAL_BLOGS;
  }
}

export async function getBlogById(id: string): Promise<BlogPost | null> {
  try {
    const ref = doc(db, BLOGS_COLL, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as BlogPost;
    }
    return INITIAL_BLOGS.find((b) => b.id === id) || null;
  } catch (err) {
    console.error(err);
    return INITIAL_BLOGS.find((b) => b.id === id) || null;
  }
}

export async function getBlogComments(blogId: string): Promise<BlogComment[]> {
  try {
    const snap = await getDocs(collection(db, COMMENTS_COLL));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BlogComment))
      .filter((c) => c.blogId === blogId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function submitBlogComment(comment: Omit<BlogComment, 'id' | 'createdAt'>): Promise<void> {
  const collRef = collection(db, COMMENTS_COLL);
  await addDoc(collRef, {
    ...comment,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Contacts Message Inbox
 */
export async function submitContactMessage(msg: Omit<ContactMessage, 'id' | 'status' | 'createdAt'>): Promise<void> {
  const collRef = collection(db, CONTACTS_COLL);
  await addDoc(collRef, {
    ...msg,
    status: 'unread',
    createdAt: new Date().toISOString(),
  });
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  try {
    const snap = await getDocs(collection(db, CONTACTS_COLL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactMessage));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function deleteContactMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, CONTACTS_COLL, id));
}
