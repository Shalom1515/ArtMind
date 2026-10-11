import mongoose from 'mongoose';

const viewEventSchema = new mongoose.Schema(
  {
    painting: { type: mongoose.Schema.Types.ObjectId, ref: 'Painting', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    visitorId: { type: String, default: '' },
    category: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

viewEventSchema.index({ createdAt: -1 });
viewEventSchema.index({ painting: 1, createdAt: -1 });
viewEventSchema.index({ user: 1, createdAt: -1 });
viewEventSchema.index({ visitorId: 1, painting: 1, createdAt: -1 });

export const ViewEvent = mongoose.model('ViewEvent', viewEventSchema);
