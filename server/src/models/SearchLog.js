import mongoose from 'mongoose';

const chipSchema = new mongoose.Schema({ type: { type: String }, value: String }, { _id: false });

const searchLogSchema = new mongoose.Schema(
  {
    query: { type: String, required: true, trim: true, maxlength: 200 },
    normalised: { type: String, required: true, lowercase: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    understood: { type: [chipSchema], default: [] },
    resultCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

searchLogSchema.index({ createdAt: -1 });
searchLogSchema.index({ normalised: 1 });

export const SearchLog = mongoose.model('SearchLog', searchLogSchema);
