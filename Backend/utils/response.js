const Groq=require('groq-sdk')

const groq = new Groq({ apiKey: process.env.IRIS_API_KEY });

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
    model: "openai/gpt-oss-120b",
  });
}
module.exports={
    AgentReply
}