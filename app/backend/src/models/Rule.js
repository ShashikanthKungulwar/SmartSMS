import {Schema,model} from "mongoose"


const RuleSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['OTP', 'Bank', 'Promo', 'Delivery', 'Spam', 'Personal'], required: true },
  pattern:  { type: String, required: true },   // regex string to match SMS body
  action:   { type: String, enum: ['delete', 'archive', 'notify'], required: true },
  ttl:      { type: Number, default: 60 },      // minutes before auto-delete (OTP default: 60)
  priority: { type: Number, default: 0 },       // higher = evaluated first
  isActive: { type: Boolean, default: true }
},{timestamps:true});

RuleSchema.index({userId:1,isActive:1,priority:-1})

export default  model('Rule',RuleSchema)