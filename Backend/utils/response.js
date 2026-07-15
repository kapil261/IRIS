const Groq=require('groq-sdk')
const fs = require('fs');
const path = require('path');

const groq = new Groq({ apiKey: process.env.IRIS_API_KEY });

function getSystemPrompt() {
  try {
    const filePath = path.join(__dirname, '../config/custom_instructions.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      let prompt = `You are ${data.assistantName || 'IRIS'}, a highly intelligent technical AI assistant. You were developed and created by ${data.developer || 'Kapil Goyal'}.`;
      if (data.customRules && data.customRules.length > 0) {
        prompt += "\n\nAdhere to the following custom guidelines:";
        data.customRules.forEach((rule) => {
          prompt += `\n- ${rule}`;
        });
      }
      return prompt;
    }
  } catch (err) {
    console.error("Error reading custom instructions:", err);
  }
  return "You are IRIS, a helpful technical AI assistant created by Kapil Goyal.";
}

async function AgentReply(userMessage) {
  const chatCompletion = await getGroqChatCompletion(userMessage);
  return chatCompletion.choices[0]?.message?.content || "";
}

async function getGroqChatCompletion(userMessage) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    model: "llama-3.3-70b-versatile",
  });
}

async function AgentStreamReply(userMessage, chatHistory = []) {
  const messages = [
    {
      role: "system",
      content: getSystemPrompt()
    }
  ];
  
  // Format past history correctly for the model
  chatHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  });

  // Add current augmented prompt
  messages.push({
    role: "user",
    content: userMessage
  });

  return groq.chat.completions.create({
    messages,
    model: "llama-3.3-70b-versatile",
    stream: true
  });
}

module.exports={
    AgentReply,
    AgentStreamReply
}