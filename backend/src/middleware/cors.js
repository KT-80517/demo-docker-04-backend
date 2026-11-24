/**
 * CORS middleware.
 *
 * `allowedOrigins` comes from CORS_ORIGIN: either "*" (any origin) or a
 * comma-separated list such as "http://localhost:5173,http://localhost:8080".
 * With a list, the request's Origin is echoed back only when it is on the
 * list; other origins get no Access-Control-Allow-Origin header, so the
 * browser blocks the response.
 */
function parseOrigins(value) {
  return (value || '*')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function cors(allowedOrigins) {
  const allowAny = allowedOrigins.includes('*');

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (allowAny) {
      res.set('Access-Control-Allow-Origin', '*');
    } else {
      // The response differs per Origin, so caches must key on it.
      res.vary('Origin');
      if (origin && allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
      }
    }

    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '600');
      return res.sendStatus(204);
    }
    next();
  };
}

module.exports = { cors, parseOrigins };
