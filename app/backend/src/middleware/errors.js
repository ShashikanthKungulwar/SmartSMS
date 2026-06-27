const errorhandler = (err,req,res,next)=>{
    console.log(`[Error] ${err.message}`);
    const status = err.status || 500; 
    res.status(status).json({
        error:err.message || "Internal Server Error",
        ...(process.env.NODE_ENV == 'development' && {stack:err.stack})
    })
}

export default errorhandler;