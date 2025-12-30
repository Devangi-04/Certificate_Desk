function success(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res, error = 'Something went wrong', status = 500) {
  return res.status(status).json({ success: false, error });
}

function notFoundHandler(req, res, next) {
  res.status(404).json({ success: false, error: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  console.error('API Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = {
  success,
  failure,
  notFoundHandler,
  errorHandler,
};
