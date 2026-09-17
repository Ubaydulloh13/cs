import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { handleApi } from "../server/api.js";
import { openDatabase } from "../server/local-db.js";

const dataDir = "/tmp/strikezone";
mkdirSync(dataDir, { recursive: true });

let database;
function getDatabase() {
  database ??= openDatabase(resolve(dataDir, "accounts.sqlite"));
  return database;
}

async function readBody(request) {
  if (request.method === "GET") return undefined;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(request, response) {
  try {
    const protocol = request.headers["x-forwarded-proto"] || "https";
    const host = request.headers.host || "localhost";
    const body = await readBody(request);
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined)
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    const webRequest = new Request(`${protocol}://${host}${request.url}`, {
      method: request.method,
      headers,
      body,
    });
    const result = await handleApi(webRequest, {
      DB: getDatabase(),
      ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    });
    response.statusCode = result.status;
    result.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    console.error("Vercel API error", error);
    response.statusCode = 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({ error: "Account serverida xatolik yuz berdi." }),
    );
  }
}