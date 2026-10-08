import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Verify Authorization: Bearer <token> and attach req.user.
 */
export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    req.auth = { userId: user._id.toString(), role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional auth — attaches user when token is present/valid, otherwise continues.
 */
export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme === 'Bearer' && token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (user) {
          req.user = user;
          req.auth = { userId: user._id.toString(), role: user.role };
        }
      } catch {
        // ignore invalid optional token
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export default { protect, optionalAuth };
