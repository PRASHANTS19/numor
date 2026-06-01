const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    // const token = req.cookies?.access_token;

    
    // 1. Get the Authorization header (usually looks like "Bearer eyJhbG...")
    const authHeader = req.headers.authorization;

    // 2. Check if header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const error = new Error("Unauthorized: No token provided");
        error.statusCode = 401;
        return next(error);
    }

    // 3. Extract the actual token string
    const token = authHeader.split(" ")[1];


    if (!token){
        const error = new Error("Unauthorized");
        error.statusCode = 401;
        return next(error);
    }

    try{
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decode;
        next();
    }
    catch(err){
        const error = new Error('Invalid token');
        error.statusCode = 401;
        return next(error);
    }
}

module.exports = authMiddleware;
