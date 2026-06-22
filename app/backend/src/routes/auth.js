import router from express.Router();
import jwt from jsonwebtoken;
import UserSchema from "../models/UserSchema.js";
import {OAuth2Clinet} from 'google-auth-library';
import validator from "validator"

const googleClinet = new OAuth2Clinet(process.env.GOOGLE_CLIENT_ID);


const makeTokens =  (userId) =>({
    accessToken:jwt.sign(
        {userId},
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    ),
    refreshToken:jwt.sign(
        {userId},
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    )
});


router.post('/register',async (req,res)=>{
    try{
        const{email,password} = req.body;
        if(!email || !password){
            return res.status(400).json({error:"Email and password required"});
        }
        if(!validator.isEmail(email)){
            return res.status(400).json({error:"Invalid email format"})
        }
        if(password.length <8){
            return res.status(400).json({error:"password min length is 8"});
        }
        if(await UserSchema.findOne({email})) return res.status(409).json({error:"Email alredy registered"});
        const user = await UserSchema.create({
            email:email,
            password:password,
            authProvider:"local"
        });
        const tokens = makeTokens(user._id)
        user.refreshToken = tokens.refreshToken;

        await user.save()
        res.status(201).json(tokens);
    }
    catch(error){
        res.status(500).json({error : error.message});
    }
})


router.post("/login",async (req,res)=>{
    try{
        const {email,password} = req.body
        if(!email || !password){
            return res.status(400).json({error:"Email and password required"});
        }
        const user =await UserSchema.findOne({email});

        if(!user || user.authProvider !== 'local' || !(await user.matchPassword(password))){
            return res.status(401).json({error:"Invalid Error"})
        };

        const tokens = makeTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        user.save()
        res.json(tokens);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
})


router.post("/google",async (req,res)=>{
    try{        
        const {idToken} = req.body;
        if(!idToken) return res.status(400).json({error:"Token id is required"});

        const ticket  = await googleClinet.verifyToken({
            idToken,
            audience:process.env.GOOGLE_CLIENT_ID
        })

        const payload = ticket.getPayload();

        let user = await UserSchema.findOne({googleId:payload.sub})

        if(!user){
            user = await UserSchema.findOne({email:payload.email})
            if(user){
                //updating local to google auth
                user.authProvider="google";
                user.avatar = payload.picture;
                user.googleId = payload.sub;
                await user.save();
            }
            else{
                user = await UserSchema.create({
                    email:payload.email,
                    name:payload.name,
                    authProvider:"google",
                    googleId:payload.sub,
                    avatar:payload.picture
                })
            }
        }
        tokens = makeTokens(user._id);
        user.refreshToken = tokens.refreshToken

        user.save();
        res.status(201).json(tokens)

    }catch(error) {
        res.status(401).json({error:"Invalid Google token"})
    }
})

router.post("/refresh",async (req,res)=>{
    try{
        const {refreshToken} = req.body;
        if(!refreshToken){
            return res.status(401).json({
                error:"Refresh token is required"
            });
        }
        const payload = jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET)
        const user = await UserSchema.findById(payload.id)
        if(!user || user.refreshToken !== refreshToken){
            return res.status(403).json({error:"expired token usage detected"});
        }
        const tokens = makeTokens(user._id);
        user.refreshToken = tokens.refreshToken
        await user.save();
        res.status(200).json(tokens)
    }catch(error){
        res.status(403).json({error:"Invalid or expired token"})
    }
})

router.post('/logout',async (req,res)=>{
    const {refreshToken} = req.body;
    if(refreshToken){
        try{
            const payload = jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET);
            await UserSchema.findByIdAndUpdate(payload.id,{refreshToken:null});
        }catch{}
    }
    res.json({message:"Logged Out"})
})

export default router;
// TO DO
// email verification before creation of account