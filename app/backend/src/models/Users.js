import bcrypt from 'bcryptjs';
import mogoose from 'mongoose';


const UserSchema = new mogoose.Schema({
    name:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        minlength:8,
        maxlength:15
    },
    email:{
        type:String,
        required:true,
        unique:true,
        primaryKey:true
    },
    authprovider:{
        type:String,
        required:true,
        enum:['local','google']
    },
    googleId:{
        type:String
    },
    refreshtoken:{
        type:String
    },
    avatar:{
        type:String
    }
});

UserSchema.pre('save', async ()=>{
    this.password = await bcrypt.hash(this.password,10)  
})

UserSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
}