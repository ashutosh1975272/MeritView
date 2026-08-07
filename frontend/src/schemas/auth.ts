import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least 1 letter and 1 number'),
  confirmPassword: z.string(),
  displayName: z.string().max(100, 'Display name must be 100 characters or less').optional(),
  acceptTerms: z.boolean().refine(v => v === true, 'You must accept the terms'),
  marketingOptIn: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
