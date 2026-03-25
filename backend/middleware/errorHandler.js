// middleware/errorHandler.js — Global error handler
function errorHandler(err, req, res, next) {
  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path} —`, err.stack || err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFound };
