require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/user.model');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const user = await User.findOne({ email: 'test@test.com' });
    if (!user) {
      console.error("User test@test.com not found in DB.");
      await mongoose.connection.close();
      return;
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key_iris',
      { expiresIn: '1d' }
    );
    console.log("Generated JWT Token.");

    const threadid = 'thread_test_rag_api_' + Date.now();
    console.log(`Sending message with useDocuments: true on thread ${threadid}...`);

    const res = await fetch('http://localhost:3000/api/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        threadid,
        message: 'Who is the teacher in this report?',
        useDocuments: true
      })
    });

    const data = await res.json();
    console.log("\nResponse received!");
    console.log("Status:", res.status);
    console.log("Reply:", data.reply);
    console.log("Sources count:", data.sources?.length || 0);
    if (data.sources && data.sources.length > 0) {
      data.sources.forEach((s, idx) => {
        console.log(`Source ${idx + 1}: ${s.filename} (Score: ${s.score})`);
      });
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error("API Test failed:");
    console.error(err);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

test();
