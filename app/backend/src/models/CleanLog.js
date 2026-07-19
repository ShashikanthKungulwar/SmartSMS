import { Schema, model } from 'mongoose';

const cleanLogSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category:  { type: String, required: true },
  action:    { type: String, required: true },
  cleanedAt: { type: Date, default: Date.now },
});

cleanLogSchema.index({ userId: 1, cleanedAt: -1 });

export default model('CleanLog', cleanLogSchema);
