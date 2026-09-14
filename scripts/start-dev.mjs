import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ensureAdminCredentials } from "./create-admin.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function checkNodeVersion(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  if (!Number.isInteger(major) || major < 22 || (major === 22 && minor < 13)) {
    throw new Error(
      `Node.js ${version} is too old. Install Node.js 22.13 or newer (24 LTS recommended), reopen the terminal, then run npm run dev again.`,
    );
  }
}

export async function missingDependencies(root = projectRoot) {
  const manifest = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8"),
  );
  const require = createRequire(resolve(root, "package.json"));
  const missing = [];
  for (const name of Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  })) {
    try {
      require.resolve(name);
    } catch (error) {
      // Some CLI-only packages intentionally do not export a root module.
      if (
        error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED" ||
        existsSync(resolve(root, "node_modules", name, "package.json"))
      )
        continue;
      missing.push(name);
    }
  }
  return missing;
}

export async function installDependencies(root = projectRoot) {
  const npmCli =
    process.env.npm_execpath ||
    resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  if (!existsSync(npmCli))
    throw new Error(
      "Dependencies are missing. Run npm ci in this project folder, then npm run dev.",
    );
  console.log("Installing missing project packages from package-lock.json...");
  await new Promise((accept, reject) => {
    const child = spawn(
      process.execPath,
      [
        npmCli,
        existsSync(resolve(root, "package-lock.json")) ? "ci" : "install",
      ],
      { cwd: root, stdio: "inherit", windowsHide: true },
    );
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? accept()
        : reject(
            new Error(
              "Package installation failed. Check your internet connection, run npm ci, then npm run dev.",
            ),
          ),
    );
  });
}

export async function startDev() {
  checkNodeVersion();
  process.chdir(projectRoot);
  if ((await missingDependencies()).length) await installDependencies();
  const remaining = await missingDependencies();
  if (remaining.length)
    throw new Error(
      "Missing packages: " +
        remaining.join(", ") +
        ". Run npm ci and try again.",
    );
  const admin = await ensureAdminCredentials();
  console.log("Operator login details: " + admin.loginPath);
  console.log(
    "Keep this file private. Accounts and purchases are saved in .data/accounts.sqlite.",
  );
  // Let Vite's CLI parse --host/--port exactly as before. Import only after setup.
  const require = createRequire(resolve(projectRoot, "package.json"));
  const vitePackage = require.resolve("vite/package.json");
  await import(
    pathToFileURL(resolve(dirname(vitePackage), "bin/vite.js")).href
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  startDev().catch((error) => {
    console.error("\nSTRIKEZONE could not start: " + error.message);
    process.exitCode = 1;
  });
}
