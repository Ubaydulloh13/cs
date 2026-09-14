import { readFileSync, mkdirSync } from "node:fs";
import { openDatabase } from "./local-db.js";
import { handleApi } from "./api.js";
export function gameApi() {
  return {
    name: "strikezone-accounts",
    configureServer(server) {
      mkdirSync(".data", { recursive: true });
      const DB = openDatabase(".data/accounts.sqlite");
      let secrets = {};
      try {
        secrets = JSON.parse(
          readFileSync(".private/server-secrets.json", "utf8"),
        );
      } catch {}
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/")) return next();
        try {
          const chunks = [];
          let bytes = 0;
          for await (const c of req) {
            bytes += c.length;
            if (bytes > 16384) {
              res.statusCode = 413;
              res.end();
              return;
            }
            chunks.push(c);
          }
          const origin = "http://" + req.headers.host;
          const request = new Request(origin + req.url, {
            method: req.method,
            headers: req.headers,
            ...(req.method === "POST" ? { body: Buffer.concat(chunks) } : {}),
          });
          const result = await handleApi(request, { DB, ...secrets });
          res.statusCode = result.status;
          result.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await result.arrayBuffer()));
        } catch {
          res.statusCode = 500;
          res.end("API error");
        }
      });
      server.httpServer?.once("close", () => DB.close());
    },
  };
}
