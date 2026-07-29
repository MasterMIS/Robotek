import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketIO } from "./src/server/socket";
import { ensureChatSchema } from "./src/lib/chat-sheets";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  try {
    await ensureChatSchema();
    console.log("[chat] Sheet schema verified");
  } catch (err) {
    console.warn("[chat] Schema init skipped:", err);
  }

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  initSocketIO(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (with Socket.io)`);
  });
});
