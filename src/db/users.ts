import { db, users } from './index.ts';
import { eq } from 'drizzle-orm';

const INITIAL_ADMIN_EMAIL = 'rifqi.far@gmail.com';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const isInitialAdmin = normalizedEmail === INITIAL_ADMIN_EMAIL.toLowerCase();

    const [existing] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing) {
      if (isInitialAdmin && existing.role !== 'admin') {
        const [promoted] = await db
          .update(users)
          .set({ email: normalizedEmail || existing.email, role: 'admin' })
          .where(eq(users.uid, uid))
          .returning();
        return promoted;
      }
      return existing;
    }

    const [user] = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail || `${uid}@firebase.local`,
        role: isInitialAdmin ? 'admin' : 'user',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: normalizedEmail || `${uid}@firebase.local` },
      })
      .returning();

    return user;
  } catch (error) {
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}
