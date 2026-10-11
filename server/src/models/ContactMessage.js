import mongoose from 'mongoose';
import { CONTACT_SUBJECTS, MESSAGE_STATUSES } from '../config/constants.js';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, enum: CONTACT_SUBJECTS, required: true },
    message: { type: String, required: true, minlength: 10, maxlength: 2000 },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'new' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
