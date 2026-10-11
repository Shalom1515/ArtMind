import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    shortLine: { type: String, default: '' },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    paintings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Painting' }],
  },
  { timestamps: true },
);

export const Collection = mongoose.model('Collection', collectionSchema);
