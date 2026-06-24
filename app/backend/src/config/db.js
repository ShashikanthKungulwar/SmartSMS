import mongoose from "mongoose";

const dBconnection = async () => {
    try {
        
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error("Database connection error:", error);
    }
};

export default dBconnection;
