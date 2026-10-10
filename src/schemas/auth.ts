import { z } from 'zod';
import { urlNameSchema } from './common';

export const usernameSchema = urlNameSchema('Username', 20);

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);

// bcrypt ignores everything after 72 bytes, so longer passwords would silently be truncated.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password is too long.');

export const displayNameSchema = z.string().trim().min(1, 'Name is required.').max(50);

export const signUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema.optional(),
});

export const signInSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username.').max(254),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const tokenSchema = z.object({ token: z.string().min(20).max(200) });

/** The 6-digit code from a sign-up or password-reset email, checked against the email it was sent to. */
export const emailCodeSchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: displayNameSchema.optional(),
  bio: z.string().trim().max(300).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.').max(200),
  newPassword: passwordSchema,
});
