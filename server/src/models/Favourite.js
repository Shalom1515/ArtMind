import mongoose from 'mongoose';

const favouriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    painting: { type: mongoose.Schema.Types.ObjectId, ref: 'Painting', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

favouriteSchema.index({ user: 1, painting: 1 }, { unique: true });
favouriteSchema.index({ painting: 1 });

export const Favourite = mongoose.model('Favourite', favouriteSchema);
