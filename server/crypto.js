const enc = new TextEncoder();
export const hex = (b) =>
  Array.from(new Uint8Array(b), (n) => n.toString(16).padStart(2, "0")).join(
    "",
  );
export const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async (s) =>
  hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
export async function passwordHash(
  password,
  salt = hex(crypto.getRandomValues(new Uint8Array(16))),
) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: enc.encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return "pbkdf2$" + salt + "$" + hex(hash);
}
export async function verifyPassword(password, stored) {
  if (!/^pbkdf2\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(stored || "")) return false;
  const expected = await passwordHash(password, stored.split("$")[1]);
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ stored.charCodeAt(i);
  return diff === 0;
}
