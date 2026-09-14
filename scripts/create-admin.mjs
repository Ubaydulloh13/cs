import { mkdir, readFile, writeFile } from "node:fs/promises";
import { passwordHash, token } from "../server/crypto.js";
await mkdir(".private", { recursive: true });
try {
  await readFile(".private/server-secrets.json");
  console.log("Existing administrator credentials retained.");
} catch {
  const password = "SZ-" + token().slice(0, 22);
  await writeFile(
    ".private/server-secrets.json",
    JSON.stringify({ ADMIN_PASSWORD_HASH: await passwordHash(password) }),
  );
  await writeFile(
    ".private/admin-login.txt",
    "Login: operator\nPassword: " +
      password +
      "\n\nKeep private. Change password in Shop > Account after first login.\n",
  );
  console.log(
    "Administrator credentials saved privately in .private/admin-login.txt",
  );
}
