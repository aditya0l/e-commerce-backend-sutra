const { AppError } = require('../utils/AppError');

/**
 * Role-Based Access Control middleware factory.
 * Usage: restrict('ADMIN', 'SUPPORT')
 */
const restrict = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action.', 403));
        }
        next();
    };
};

module.exports = { restrict };
