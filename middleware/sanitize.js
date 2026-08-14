// middleware/sanitize.js
const xss = require('xss');

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return xss(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = sanitizeValue(value[key]);
    }
    return value;
  }
  return value; // number, boolean, null, undefined
}

// Remove/escapa tags HTML e JS de todos os campos string do body (recursivo).
// Roda antes das validações específicas de cada rota.
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      req.body[key] = sanitizeValue(req.body[key]);
    }
  }
  next();
}

function sanitizeQuery(req, res, next) {
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      req.query[key] = sanitizeValue(req.query[key]);
    }
  }
  next();
}

module.exports = { sanitizeBody, sanitizeQuery };