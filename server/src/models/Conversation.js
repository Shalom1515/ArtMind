import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true, maxlength: 4000 },
    paintings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Painting' }],
    followUps: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New conversation', maxlength: 120 },
    context: {
      paintingSlug: String,
      query: String,
    },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

conversationSchema.index({ user: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
