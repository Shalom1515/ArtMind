import mongoose from 'mongoose';
import { CATEGORIES, COLOUR_GROUPS, MEDIUMS, MOODS, SURFACES } from '../config/constants.js';

const hex = { type: String, match: /^#[0-9A-Fa-f]{6}$/ };

const paintingSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
    artistSlug: { type: String, required: true },
    year: { type: Number, min: 1000, max: 2100 },
    category: { type: String, enum: CATEGORIES, required: true },
    style: { type: String, required: true, trim: true },
    medium: { type: String, enum: MEDIUMS, required: true },
    surface: { type: String, enum: SURFACES, required: true },
    widthCm: { type: Number, min: 1 },
    heightCm: { type: Number, min: 1 },
    orientation: { type: String, enum: ['portrait', 'landscape', 'square'] },
    colours: { type: String, default: '' },
    colourGroups: { type: [{ type: String, enum: COLOUR_GROUPS.map((c) => c.key) }], default: [] },
    mood: { type: String, enum: MOODS },
    description: { type: String, default: '' },
    summary: { type: String, default: '' },
    tags: { type: [String], default: [] },
    tones: { type: [hex], default: [] },
    palette: { type: [hex], default: [] },
    dominantColour: { type: String, enum: [...COLOUR_GROUPS.map((c) => c.key), ''], default: '' },
    embedding: { type: [Number], default: undefined, select: false },
    viewCount: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
    heroOfDay: { type: Boolean, default: false },
    image: { type: String, required: true },
  },
  { timestamps: true },
);

paintingSchema.index({ category: 1, year: -1 });
paintingSchema.index({ artist: 1 });
paintingSchema.index({ artistSlug: 1 });
paintingSchema.index({ viewCount: -1 });
paintingSchema.index(
  { title: 'text', tags: 'text', description: 'text' },
  { weights: { title: 5, tags: 3, description: 1 }, name: 'painting_text' },
);

paintingSchema.pre('validate', function setOrientation() {
  if (this.widthCm && this.heightCm) {
    if (this.widthCm === this.heightCm) this.orientation = 'square';
    else this.orientation = this.widthCm > this.heightCm ? 'landscape' : 'portrait';
  }
});

export const Painting = mongoose.model('Painting', paintingSchema);
