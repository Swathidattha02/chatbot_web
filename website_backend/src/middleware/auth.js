const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No authentication token, access denied",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Support both old tokens (userId) and new tokens (id + role)
        req.user = {
            id: decoded.id || decoded.userId,
            role: decoded.role || "student",
            username: decoded.username || decoded.name,
            isAdmin: decoded.role === "admin",
        };
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Token is invalid or expired",
        });
    }
};

// Alias for named import
const protect = authMiddleware;

module.exports = authMiddleware;
module.exports.protect = protect;
module.exports.authenticate = authMiddleware;
