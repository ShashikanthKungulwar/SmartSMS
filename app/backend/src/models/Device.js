import {Schema,model} from 'mongoose';


const deviceSchema = new Schema({
    userId:{
        type : Schema.Types.ObjectId,ref:'User',required:true
    },
    deviceId:{
        type:String,requred:true
    },
    platform:{
        type:String,enum:['android','ios'],default:'android'
    },
    lastSyncAt:{
        type:Date,default:null
    },
    isActive:{
        type:Boolean,default:true
    }
},{timestamps:true});


deviceSchema.index({userId:1,deviceId:1},{unique:true});

export default model('Device',deviceSchema)
