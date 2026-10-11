import mongoose from 'mongoose';

const artistSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    bornYear: { type: Number, min: 1800, max: 2100 },
    styles: { type: [String], default: [] },
    bio: { type: String, default: '' },
    portrait: { type: String, default: '' },
  },
  { timestamps: true },
);

artistSchema.index({ name: 1 });

export const Artist = mongoose.model('Artist', artistSchema);
