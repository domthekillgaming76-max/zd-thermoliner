export function verifyCronAuth(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'CRON_SECRET not configured', created: 0, archived: 0, errors: ['CRON_SECRET missing'] });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token || token !== secret) {
    return res.status(401).json({ error: 'Unauthorized', created: 0, archived: 0, errors: ['Invalid cron secret'] });
  }

  next();
}
