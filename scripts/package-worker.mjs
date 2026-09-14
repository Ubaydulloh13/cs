import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
import { build } from "esbuild";
// A self-contained Worker keeps the existing Vite app deployable without an
// additional storage binding or a dedicated game server. Games run on the host.
const root = resolve("dist");
const assets = {};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".glb": "model/gltf-binary",
};
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.name.startsWith(".") || item.name === "server") continue;
    const path = resolve(dir, item.name);
    if (item.isDirectory()) await walk(path);
    else {
      const url = "/" + relative(root, path).replaceAll("\\", "/");
      assets[url] = {
        type: mime[extname(path)] || "application/octet-stream",
        data: (await readFile(path)).toString("base64"),
      };
    }
  }
}
await walk(root);
if (!assets["/index.html"]) throw new Error("Missing built index.html");
const siteOrigin = new URL(
  Buffer.from(assets["/index.html"].data, "base64")
    .toString("utf8")
    .match(/property="og:url" content="([^"]+)"/)[1],
).origin;
await mkdir(resolve(root, "server"), { recursive: true });
const apiBundle = await build({
  absWorkingDir: resolve("."),
  entryPoints: [resolve("server/api.js")],
  tsconfigRaw: {},
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  write: false,
  minify: true,
});
const worker =
  apiBundle.outputFiles[0].text.replace(
    /export\s*\{([^}]+)\}\s*;?\s*$/,
    (_, exports) => {
      const name = exports.trim().split(/\s+as\s+/)[0];
      return `const apiHandler=${name};`;
    },
  ) +
  `\nconst assets=${JSON.stringify(assets)};
export default { async fetch(request,env) {
 if(new URL(request.url).pathname.startsWith('/api/'))return apiHandler(request,env);
 if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const path=new URL(request.url).pathname;
 const item=assets[path==='/'?'/index.html':path];
 if(!item) return new Response('Not found',{status:404});
 const headers={'Content-Type':item.type,'X-Content-Type-Options':'nosniff','Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':path.endsWith('.png')?'public, max-age=86400':'no-cache'};
 if(request.method==='HEAD') return new Response(null,{headers});
 const raw=atob(item.data);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 if(item.type.startsWith('text/html'))return new Response(new TextDecoder().decode(bytes).replaceAll(${JSON.stringify(siteOrigin)},new URL(request.url).origin),{headers});
 return new Response(bytes,{headers});
}};
`;
await writeFile(resolve(root, "server/index.js"), worker);
console.log(
  `Worker packaged: ${Object.keys(assets).length} assets, ${(Buffer.byteLength(worker) / 1024 / 1024).toFixed(1)} MiB.`,
);
