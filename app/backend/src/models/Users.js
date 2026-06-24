import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';


const UserSchema = new mongoose.Schema({
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
// learning 
UserSchema.pre('save', async function(){
    // console.log(this)

    if(this.password)
        this.password = await bcrypt.hash(this.password,10)  
    // console.log(this.password)
})

UserSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
}

export default mongoose.model('User',UserSchema);