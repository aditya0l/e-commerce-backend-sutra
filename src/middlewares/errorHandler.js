const logger = require('../config/logger');
const { AppError } = require('../utils/AppError');

const handlePrismaError = (err) => {
    if (err.code === 'P2002') return new AppError(`Duplicate field value: ${err.meta?.target?.join(', ')}`, 409);
    if (err.code === 'P2025') return new AppError('Record not found.', 404);
    if (err.code === 'P2003') return new AppError('Invalid reference: related record not found.', 400);
    return new AppError('Database error.', 500);
};

const handleZodError = (err) => {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return new AppError(`Validation error — ${message}`, 400);
};

const errorHandler = (err, req, res, next) => {
    let error = err;

    // Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') error = handlePrismaError(err);

    // Zod validation errors
    if (err.name === 'ZodError') error = handleZodError(err);

    const statusCode = error.statusCode || 500;
    const message = error.isOperational ? error.message : 'Something went wrong. Please try again.';

    if (statusCode >= 500) {
        logger.error({ message: err.message, stack: err.stack, url: req.originalUrl, method: req.method });
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { errorHandler };
