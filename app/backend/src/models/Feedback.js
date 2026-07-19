import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  smsHash:   { type: String, required: true },   // hash, NOT plaintext — privacy
  text:      { type: String, required: true },   // needed for retraining (see note)
  predicted: { type: String, required: true },
  correct:   { type: String, required: true },
  used:      { type: Boolean, default: false },  // consumed by a retrain run?
}, { timestamps: true });

feedbackSchema.index({ used: 1 });

export default mongoose.model('Feedback', feedbackSchema);