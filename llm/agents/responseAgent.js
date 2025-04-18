const BaseAgent = require("./BaseAgent.js");
const { getWSS } = require("../../lib/WSSocket.js");


const socketManager = require("../../lib/SocketManager.js");

class ResponseAgent extends BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    super(model, temperature);
  }

  async sendStreamToClient(userid, mcpMessage) {
    const userIdStr = userid.toString();
    //console.log("[ResponseAgent] Stream gönderiliyor:", { userIdStr });


    const user = socketManager.userSockets.get(userIdStr);
    if (!user) {
      console.warn("[ResponseAgent] WebSocket bulunamadı:", userIdStr, "Map:", Array.from(socketManager.userSockets.keys()));
      return;
    }
    const ws = user.socket;
  /*   if (!ws.isAuthenticated) {
      console.warn("[ResponseAgent] WebSocket doğrulanmamış:", userIdStr);
      return;
    } */
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn("[ResponseAgent] WebSocket kapalı:", userIdStr, "readyState:", ws.readyState);
      socketManager.userSockets.delete(userIdStr);
      return;
    }
    ws.send(JSON.stringify({ event: "agent-feedback", data: mcpMessage }));
    //console.log("[ResponseAgent] Stream gönderildi:", userIdStr);
  }

  async sendIntentToClient(userid, intent) {
    const userIdStr = userid
    console.log("[ResponseAgent] Intent gönderiliyor:", { userIdStr, intent });
    const user = socketManager.userSockets.get(userIdStr);
    if (!user) {
      console.warn("[ResponseAgent] WebSocket bulunamadı:", userIdStr, "Map:", Array.from(socketManager.userSockets.keys()));
      return;
    }
    const ws = user.socket;

   /*  if (!ws.isAuthenticated) {
      console.warn("[ResponseAgent] WebSocket doğrulanmamış:", userIdStr);
      return;
    } */
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn("[ResponseAgent] WebSocket kapalı:", userIdStr, "readyState:", ws.readyState);
      socketManager.userSockets.delete(userIdStr);
      return;
    }
    ws.send(JSON.stringify({ event: "intent", data: { intent } }));
    console.log("[ResponseAgent] Intent gönderildi:", userIdStr);
  }

  async senSystemMessage(userid, messages) {
    const userIdStr = userid.toString();
    const user = socketManager.userSockets.get(userIdStr);
    if (!user) {
      console.warn("[ResponseAgent] WebSocket bulunamadı:", userIdStr, "Map:", Array.from(socketManager.userSockets.keys()));
      return;
    }
    const ws = user.socket;
    /* if (!ws.isAuthenticated) {
      console.warn("[ResponseAgent] WebSocket doğrulanmamış:", userIdStr);
      return;
    } */
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn("[ResponseAgent] WebSocket kapalı:", userIdStr, "readyState:", ws.readyState);
      socketManager.userSockets.delete(userIdStr);
      return;
    }
    ws.send(JSON.stringify({ event: "create_message", data: { messages } }));
    console.log("[ResponseAgent] Intent gönderildi:", userIdStr);
  }

  async sendResponseStream(mcpMessage, onTokenCallback) {
    console.log(`[ResponseAgent] MCP stream başlatılıyor, model: ${this.model_name}`);
    return await this.sendAgentCompletionStream(mcpMessage, (token) => {
      onTokenCallback({ ...token, delta: { ...token.delta, content: token.delta.content } });
    });
  }

  async sendResponse(mcpMessage) {
    return await this.sendAgentCompletion(mcpMessage);
  }
}



module.exports = ResponseAgent;


/**
 * class ResponseAgent extends BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    super(model, temperature);
    this.userSockets = new Map();
    this.wss = getWSS(); // WebSocket instance’ını al
  }

  startStream(server,port = 3000) {
    console.log(`[ResponseAgent] Starting WebSocket stream server on port ${port}`);

    const app = uWS.App(server);

    app.ws("/stream", {
      open: async (ws, req) => {
        const url = req.getUrl() + req.getQuery();
        const access_token = new URLSearchParams(url.split("?")[1]).get("token");
        console.log("[WebSocket] access_token:", access_token);

        // 🛡️ Yetkilendirme
        if (!access_token) {
          console.error("[WebSocket] Token bulunamadı");
          ws.send(
            JSON.stringify({
              event: "error",
              data: { message: "Token bulunamadı veya geçersiz." },
            })
          );
          ws.close(1008, "Token eksik");
          return;
        }

        try {
          const userkey = await Keycloak.getUserInfo(access_token);
          const user = await User.findOne({ keyid: userkey.sub });
          if (!user) {
            console.error("[WebSocket] Kullanıcı bulunamadı");
            ws.send(
              JSON.stringify({
                event: "error",
                data: { message: "Kullanıcı bulunamadı." },
              })
            );
            ws.close(1008, "Kullanıcı bulunamadı");
            return;
          }

          const userid = user._id;
          console.log(`[ResponseAgent] Kullanıcı bağlandı: ${userid}`);
          ws.userid = userid;
          ws.isAuthenticated = true; // Doğrulama başarılıysa true
          this.userSockets.set(userid, ws);
        } catch (error) {
          console.error("[ResponseAgent] Token doğrulama hatası:", error);
          ws.send(
            JSON.stringify({
              event: "error",
              data: { message: "Geçersiz token" },
            })
          );
          ws.close(1008, "Geçersiz token");
        }
      },

      message: async (ws, message, isBinary) => {
        try {
          const { event, data } = JSON.parse(Buffer.from(message).toString());

          if (event === "identify" && !ws.isAuthenticated) {
            if (data.userid === ws.userid) {
              ws.isAuthenticated = true;
              console.log(`[ResponseAgent] Kullanıcı doğrulandı: ${ws.userid}`);
            } else {
              ws.send(
                JSON.stringify({ event: "error", data: { message: "Geçersiz userid" } })
              );
              ws.close();
            }
          }
        } catch (error) {
          console.error("[ResponseAgent] Mesaj işleme hatası:", error);
          ws.send(JSON.stringify({ event: "error", data: { message: "Mesaj işlenemedi" } }));
        }
      },

      close: (ws) => {
        if (ws.userid) {
          console.log(`[ResponseAgent] Kullanıcı ayrıldı: ${ws.userid}`);
          this.userSockets.delete(ws.userid);
        }
      },
    });

    app.listen(port, (token) => {
      if (token) {
        console.log(`[ResponseAgent] WebSocket server ${port} portunda çalışıyor`);
      } else {
        console.error("[ResponseAgent] WebSocket server başlatılamadı");
      }
    });

    return app;
  }

  // Stream verisini client’a gönderme
  async sendStreamToClient(userid, mcpMessage) {
    const ws = this.userSockets.get(userid);
    if (ws && ws.isAuthenticated) {
      ws.send(JSON.stringify({ event: "agent-feedback", data: mcpMessage }));
    }
  }

  async sendTitleUpdate(userid, context_id) {
    const ws = this.userSockets.get(userid);
    if (ws && ws.isAuthenticated) {
      ws.send(
        JSON.stringify({
          event: "agent-update-title",
          data: { title: `Konuşma: ${context_id}` },
        })
      );
    }
  }

  async sendResponseStream(mcpMessage, onTokenCallback) {
    console.log(`[ResponseAgent] Initiating MCP stream response for model: ${this.model_name}`);
    return await this.sendAgentCompletionStream(mcpMessage, (token) => {
      // cleanMarkdown kaldırıldı, token.delta.content düz metin olarak gönderiliyor
      onTokenCallback({
        ...token,
        delta: { ...token.delta, content: token.delta.content },
      });
    });
  }

  async sendResponse(mcpMessage) {
    return await this.sendAgentCompletion(mcpMessage);
  }
}
 */