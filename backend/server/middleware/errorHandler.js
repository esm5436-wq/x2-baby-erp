export function errorHandler(err, req, res, _next) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({ error: err.message || 'Internal server error' });
}
