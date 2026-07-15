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
  passwordHash: { 
    type: String, 
    required: true 
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
