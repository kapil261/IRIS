const User = require('../models/user.model.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { sendWelcomeEmail } = require('../services/email.service');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_iris';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

/** Shape returned to the frontend for any successful sign-in. */
function authResponse(user) {
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      avatarUrl: user.avatarUrl
    }
  };
}

const signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.passwordHash
          ? "Email is already in use"
          : "This email is registered with Google. Use \"Continue with Google\" instead."
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash
    });

    sendWelcomeEmail(newUser); // best-effort, never blocks signup
    res.status(201).json(authResponse(newUser));
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error during registration", error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    if (!user.passwordHash) {
      return res.status(400).json({ message: "This account uses Google sign-in. Use \"Continue with Google\" instead." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.status(200).json(authResponse(user));
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login", error: err.message });
  }
};

/**
 * POST /api/auth/google { credential }
 * `credential` is the ID token from Google Identity Services on the frontend. It is
 * verified here (signature, audience = our client id, issuer, expiry) before trusting any
 * claim. Signs in the matching user, links Google to an existing email/password account
 * with the same verified email, or creates a new account.
 */
const googleAuth = async (req, res) => {
  if (!googleClient) {
    return res.status(503).json({ message: "Google sign-in is not configured on the server (GOOGLE_CLIENT_ID missing)." });
  }

  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: "Missing Google credential" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (err) {
    console.error("Google token verification failed:", err.message);
    return res.status(401).json({ message: "Google sign-in failed: invalid or expired token." });
  }

  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ message: "Your Google account email is not verified." });
  }

  try {
    const email = payload.email.toLowerCase();
    let user = await User.findOne({ googleId: payload.sub }) || await User.findOne({ email });

    if (user) {
      // Link Google to an existing account on first Google sign-in
      let changed = false;
      if (!user.googleId) { user.googleId = payload.sub; changed = true; }
      if (!user.avatarUrl && payload.picture) { user.avatarUrl = payload.picture; changed = true; }
      if (changed) await user.save();
    } else {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        avatarUrl: payload.picture
      });
      sendWelcomeEmail(user); // first Google sign-in = new account
    }

    res.status(200).json(authResponse(user));
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Server error during Google sign-in", error: err.message });
  }
};

/** GET /api/auth/config — public settings the login page needs (client ids are not secret). */
const getAuthConfig = (req, res) => {
  res.status(200).json({ googleClientId: GOOGLE_CLIENT_ID || null });
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.error("GetMe error:", err);
    res.status(500).json({ message: "Server error fetching profile", error: err.message });
  }
};

module.exports = {
  signup,
  login,
  googleAuth,
  getAuthConfig,
  getMe
};
