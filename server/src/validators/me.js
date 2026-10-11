import { z } from 'zod';
import { CATEGORIES, CONTACT_SUBJECTS } from '../config/constants.js';
import { emailField, newPassword } from './common.js';

export const detailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(60, 'Enter your full name.').optional(),
  bio: z.string().trim().max(300, 'Keep your bio under 300 characters.').optional(),
  country: z.string().trim().max(60, 'Choose a country.').optional(),
});

export const interestsSchema = z.object({
  interests: z
    .array(z.string(), { error: 'Pick at least one category.' })
    .transform((list) => [...new Set(list.filter((c) => CATEGORIES.includes(c)))])
    .refine((list) => list.length >= 1 && list.length <= 6, 'Pick at least one category.'),
});

export const passwordSchema = z.object({
  currentPassword: z.string({ error: 'Enter your current password.' }).min(1, 'Enter your current password.').max(200),
  newPassword,
});

export const deleteAccountSchema = z.object({
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.').max(200),
});

export const contactSchema = z.object({
  name: z.string({ error: 'Enter your name.' }).trim().min(1, 'Enter your name.').max(80, 'Keep your name under 80 characters.'),
  email: emailField,
  subject: z.enum(CONTACT_SUBJECTS, { error: 'Choose a subject.' }),
  message: z.string({ error: 'Write at least 10 characters.' }).trim().min(10, 'Write at least 10 characters.').max(2000, 'Keep it under 2000 characters.'),
});
