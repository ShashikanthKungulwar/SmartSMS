import jwt from 'jsonwebtoken';
export default function authMiddleWare(req,res,next){
    const token = req.headers.authorization?.split(' ')[1];
    if(!token){
        return res.status(401).json({error :"Login to continue!"});
    }
    try{
        const user = jwt.verify(token,process.env.JWT_SECRET);
        req.user = user;
        next()
    }
    catch{
        return res.status(401).json({error:"token expired"})
    }
}