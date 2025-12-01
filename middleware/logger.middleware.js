import Log from '../models/log.model.js';

const loggerMiddleware = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userId = req.user ? req.user.id : null;

    res.on('finish', async () => {
        const duration = Date.now() - start;
        const { statusCode } = res;

        try {
            await Log.create({
                method,
                url: originalUrl,
                status: statusCode,
                responseTime: duration,
                userId,
                ip
            });
        } catch (err) {
            console.error('Error saving log:', err);
        }
    });

    next();
};

export default loggerMiddleware;
