import mongoose from 'mongoose';
import { CATEGORIES, ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    country: { type: String, default: '', trim: true },
    bio: { type: String, default: '', maxlength: 300 },
    avatar: { type: String, default: null },
    interests: { type: [{ type: String, enum: CATEGORIES }], default: [] },
    verification: {
      codeHash: { type: String, select: false },
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      lastSentAt: Date,
    },
    reset: {
      tokenHash: { type: String, select: false },
      expiresAt: Date,
    },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    tasteSummary: { type: String, default: '' },
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    verified: this.verified,
    country: this.country,
    bio: this.bio,
    avatar: this.avatar,
    interests: this.interests,
    joinedAt: this.joinedAt,
  };
};

export const User = mongoose.model('User', userSchema);
