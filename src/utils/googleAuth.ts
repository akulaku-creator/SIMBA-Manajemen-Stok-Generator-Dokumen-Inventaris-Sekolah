import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with Workspace Google Sheets and Drive scopes
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive');

// Lightweight Google Sign-In provider for app authentication
export const appAuthProvider = new GoogleAuthProvider();

// Flag to track ongoing sign in flow
let isSigningIn = false;

// In-memory token caching (MANDATORY: DO NOT STORE in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

/**
 * Initialize auth listener on app mount (Workspace OAuth flow).
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Subscribe to Firebase Authentication state changes (for API ID token calls).
 */
export const subscribeFirebaseAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Sign in with Google for SIMBA application session (Firebase ID Token).
 */
export const signInWithGoogleApp = async (): Promise<{ user: User; idToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, appAuthProvider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current Firebase ID Token from active authenticated session (memory only).
 */
export const getFirebaseIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

/**
 * Trigger official Google Sign In popup with Workspace scopes
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token Google Workspace dari Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve active cached access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Get current Firebase User
 */
export const getCurrentGoogleUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Sign out and purge cached in-memory token
 */
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
