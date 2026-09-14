import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { passwordHash, token } from "../server/crypto.js";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

// Local bootstrap data stays outside tracked source and browser bundles.
export async function ensureAdminCredentials(root = projectRoot) {
  const privateDir = resolve(root, ".private");
  const secretPath = resolve(privateDir, "server-secrets.json");
  const loginPath = resolve(privateDir, "admin-login.txt");
  await mkdir(privateDir, { recursive: true, mode: 0o700 });
  try {
    const secrets = JSON.parse(await readFile(secretPath, "utf8"));
    if (
      !/^pbkdf2\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(
        secrets.ADMIN_PASSWORD_HASH || "",
      )
    ) {
      throw new Error(
        ".private/server-secrets.json has an invalid ADMIN_PASSWORD_HASH. Restore its saved copy; existing account passwords have not been reset.",
      );
    }
    return { secrets, loginPath, created: false };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const password = "SZ-" + token().slice(0, 22);
  const secrets = { ADMIN_PASSWORD_HASH: await passwordHash(password) };
  try {
    await writeFile(secretPath, JSON.stringify(secrets, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (error.code === "EEXIST") return ensureAdminCredentials(root);
    throw error;
  }
  await writeFile(
    loginPath,
    "Login: operator\nPassword: " +
      password +
      "\n\nKeep private. Change password in Shop > Account after first login.\n" +
      "These credentials belong to this local installation. Do not publish this file.\n",
    { mode: 0o600 },
  );
  return { secrets, loginPath, created: true };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const result = await ensureAdminCredentials();
    console.log(
      result.created
        ? "Operator account setup is ready."
        : "Existing operator credentials retained.",
    );
    console.log("Private login details: " + result.loginPath);
  } catch (error) {
    console.error("Operator setup failed: " + error.message);
    process.exitCode = 1;
  }
}
