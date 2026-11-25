import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifyLocalSessionToken } from '../lib/localSessionToken.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    authProvider: 'firebase' | 'local';
    localRole?: 'admin' | 'operator' | 'user';
    localUsername?: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty token' });
    return;
  }

  // 1. Check server-signed HMAC local session token
  const localClaims = verifyLocalSessionToken(token);
  if (localClaims) {
    req.user = {
      uid: localClaims.uid,
      email: localClaims.email,
      name: localClaims.username,
      authProvider: 'local',
      localRole: localClaims.role,
      localUsername: localClaims.username,
    };
    next();
    return;
  }

  // 2. Otherwise verify Firebase ID token
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      authProvider: 'firebase',
    };
    next();
  } catch (error) {
    console.error('Authentication token verification failed:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}
