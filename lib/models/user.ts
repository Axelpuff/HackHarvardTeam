import { z } from 'zod';

// User (SessionContext) entity
export const UserSchema = z.object({
  id: z.string().describe('Google sub claim from OAuth'),
  email: z
    .string()
    .email()
    .describe('Used only for session display; not stored beyond session'),
  consentGranted: z
    .boolean()
    .describe('Set true after first sync approval (FR-022)'),
  activeView: z
    .enum(['day', 'week'])
    .describe('Controls event subset feeding proposals (FR-011)'),
  tz: z.string().describe('Google primary calendar timezone'),
});

export type User = z.infer<typeof UserSchema>;

// Default user for session initialization
export const createDefaultUser = (
  id: string,
  email: string,
  tz: string = 'UTC'
): User => ({
  id,
  email,
  consentGranted: false,
  activeView: 'day',
  tz,
});

// Helper to validate user data
export const validateUser = (data: unknown): User => {
  return UserSchema.parse(data);
};

// Helper to update user preferences
export const updateUserPreferences = (
  user: User,
  updates: Partial<Pick<User, 'consentGranted' | 'activeView' | 'tz'>>
): User => {
  return UserSchema.parse({
    ...user,
    ...updates,
  });
};
