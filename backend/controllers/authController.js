import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';
import {
  assertEmail,
  assertPassword,
} from '../utils/validation.js';

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/register
 * Public registration cannot create ADMIN accounts. Default role: USER.
 */
export const register = asyncHandler(async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = assertEmail(req.body.email);
  const password = assertPassword(req.body.password);

  if (!name) throw new AppError('Name is required', 400);

  let role = String(req.body.role || 'USER').toUpperCase();

  // Public registration must NOT allow ADMIN
  if (role === 'ADMIN') {
    throw new AppError(
      'ADMIN accounts cannot be created via public registration',
      403
    );
  }

  if (!['USER', 'OPERATOR'].includes(role)) {
    role = 'USER';
  }

  // Only an authenticated ADMIN may create OPERATOR via this endpoint
  if (role === 'OPERATOR') {
    if (!req.user || req.user.role !== 'ADMIN') {
      role = 'USER';
    }
  }

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 409);

  const user = await User.create({ name, email, password, role });
  const token = signToken(user);

  res.status(201).json({
    token,
    user: user.toSafeJSON(),
  });
});

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const email = assertEmail(req.body.email);
  const password = assertPassword(req.body.password);

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user);

  res.json({
    token,
    user: user.toSafeJSON(),
  });
});

/**
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  res.json({
    user: req.user.toSafeJSON(),
  });
});

export default { register, login, me };
