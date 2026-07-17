import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_production';

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, schoolId, role }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

export function requirePrincipal(req, res, next) {
  if (!req.user || req.user.role !== 'PRINCIPAL') {
    return res.status(403).json({ error: 'Forbidden: Principal access required' });
  }
  next();
}

export function requireTeacher(req, res, next) {
  if (!req.user || req.user.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Forbidden: Teacher access required' });
  }
  next();
}

export function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Forbidden: Student access required' });
  }
  next();
}

// Keep generic requireRole for backward compatibility if needed in some places
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}
