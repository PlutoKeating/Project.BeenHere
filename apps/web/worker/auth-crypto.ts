const encoder = new TextEncoder();
// Cloudflare Workers Web Crypto currently caps PBKDF2 at 100,000 rounds.
const iterations = 100_000;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, rounds: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt.slice().buffer, iterations: rounds }, key, 256);
  return new Uint8Array(bits);
}

function equal(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const size = Math.max(left.length, right.length);
  for (let index = 0; index < size; index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${base64Url(salt)}$${base64Url(hash)}`;
}

export async function verifyPassword(password: string, credential: string): Promise<boolean> {
  const [algorithm, roundsText, saltText, hashText] = credential.split("$");
  const rounds = Number(roundsText);
  if (algorithm !== "pbkdf2-sha256" || rounds !== iterations || !saltText || !hashText) return false;
  try { return equal(await derive(password, fromBase64Url(saltText), rounds), fromBase64Url(hashText)); }
  catch { return false; }
}

export function createOpaqueToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashOpaqueToken(token: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}

export async function hashSessionToken(token: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(token))));
}
