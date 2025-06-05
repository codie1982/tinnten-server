require("dotenv").config();
require("colors")
const { connectRabbitWithRetry } = require("../config/rabbitConnection");
const { connectDB } = require("../config/db");

const SummarizeAgent = require("../llm/agents/summarizeAgent");

async function startAgentWorker() {
  await connectDB();

  connectRabbitWithRetry().then(async (connection) => {
    const channel = await connection.createChannel();
    const queue = "agent_queue";

    await channel.assertQueue(queue, { durable: true });
    console.log(`🤖 Agent kuyruğu dinleniyor: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      let message;
      try {
        message = JSON.parse(msg.content.toString());
      } catch (e) {
        console.error("❌ Mesaj parse hatası:", e.message);
        return channel.ack(msg);
      }

      if (!message?.type || !message?.userid || !message?.conversationid || !message?.messages) {
        console.warn("❗️Eksik alanlar: userid, conversationid veya messages");
        return channel.ack(msg);
      }

      try {
        switch (message.type) {
          case "summarize_conversation": {
            const agent = SummarizeAgent();
            await agent.start(message.llm.model || "gpt-4", message.llm.temperature || 0.4);
            let messages = message.data.system_messages || message.data.messages || [];
            const summary = await agent.summarize(messages);

            const outMessage = {
              type: "update",
              collection: "conversation",
              query: { conversationid: message.conversationid },
              payload: { summary }
            };

            channel.sendToQueue("db_queue", Buffer.from(JSON.stringify(outMessage)), {
              persistent: true
            });

            console.log("✅ Özeti db_queue’ya gönderildi:", summary);
            break;
          }

          default:
            console.warn("🚫 Bilinmeyen agent türü:", message.type);
        }

        channel.ack(msg);
      } catch (error) {
        console.error("❌ Agent çalışırken hata:", error);
        channel.nack(msg, false, true);
      }
    });
  });
}

startAgentWorker();