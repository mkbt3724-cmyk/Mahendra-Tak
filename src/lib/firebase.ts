/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Find effective measurement ID (config file or env override, default to G-BC06C7QVQE)
const measurementId = firebaseConfig.measurementId || ((import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID as string) || 'G-BC06C7QVQE';

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: measurementId,
});

// Initialize Firestore with custom databaseId
const db = initializeFirestore(app, {
  databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
} as any);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Analytics if supported and measurementId is present
let analyticsPromise: Promise<any> = Promise.resolve(null);
if (typeof window !== 'undefined' && measurementId) {
  analyticsPromise = isSupported()
    .then((supported) => {
      if (supported) {
        console.log('[Google Analytics] Firebase Analytics supported & initialized');
        return getAnalytics(app);
      }
      return null;
    })
    .catch(() => null);
}

// Global safe helper to log event across the web app
export async function logAnalyticsEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    // 1. Log to Firebase Analytics
    const analyticsInstance = await analyticsPromise;
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, eventParams);
    }
    
    // 2. Log to standard window.gtag if available
    const win = window as any;
    if (win.gtag) {
      win.gtag('event', eventName, eventParams);
    }

    console.log(`[Google Analytics] Event logged: "${eventName}"`, eventParams || '');
  } catch (err) {
    console.warn('[Google Analytics] Failed to log event:', err);
  }
}

export { app, auth, db, googleProvider };

