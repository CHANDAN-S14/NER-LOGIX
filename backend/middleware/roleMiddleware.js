/**
 * Restrict route to one or more roles.
 * Usage: requireRole('ADMIN') or requireRole('ADMIN', 'OPERATOR')
 */
export function requireRole(...roles) {
  const allowed = roles.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const role = String(req.user.role || '').toUpperCase();
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export default { requireRole };
