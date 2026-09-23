const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Absent for accounts that only ever signed in with Google
  passwordHash: {
    type: String
  },
  // Google account id ("sub" claim); set once the user signs in with Google
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatarUrl: {
    type: String
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  plan: {
    type: String,
    enum: ["free", "pro"],
    default: "free"
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
module.exports = User;
