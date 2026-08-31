import type { Env } from "./types";

type Email = { to: string; subject: string; text: string; html: string };

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
}

export function formatMessage(fromName: string, from: string, email: Email): string {
  const boundary = `beenhere-${crypto.randomUUID()}`;
  const safe = (value: string) => value.replace(/[\r\n]/g, " ");
  const html = email.html.replace(/^\./gm, "..");
  const text = email.text.replace(/^\./gm, "..");
  return [
    `From: ${encodeHeader(safe(fromName))} <${safe(from)}>`, `To: <${safe(email.to)}>`,
    `Subject: ${encodeHeader(safe(email.subject))}`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@beenhere.arr2018.dpdns.org>`, "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
    `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", text,
    `--${boundary}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", html,
    `--${boundary}--`, "",
  ].join("\r\n");
}

class ReplyReader {
  private buffer = "";
  private readonly decoder = new TextDecoder();
  constructor(private readonly reader: ReadableStreamDefaultReader<Uint8Array>) {}
  close(): void { this.reader.releaseLock(); }
  async reply(): Promise<{ code: number; message: string }> {
    const lines: string[] = [];
    while (true) {
      let newline = this.buffer.indexOf("\n");
      while (newline < 0) {
        const chunk = await this.reader.read();
        if (chunk.done) throw new Error("SMTP 连接提前关闭");
        this.buffer += this.decoder.decode(chunk.value, { stream: true });
        newline = this.buffer.indexOf("\n");
      }
      const line = this.buffer.slice(0, newline).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newline + 1);
      lines.push(line);
      if (/^\d{3} /.test(line)) return { code: Number(line.slice(0, 3)), message: lines.join("\n") };
    }
  }
}

function base64(value: string): string { return btoa(unescape(encodeURIComponent(value))); }

export async function sendEmail(env: Env, email: Email): Promise<void> {
  const { connect } = await import("cloudflare:sockets");
  const socket = connect({ hostname: env.SMTP_HOST, port: Number(env.SMTP_PORT) }, { secureTransport: "on", allowHalfOpen: false });
  const reader = new ReplyReader(socket.readable.getReader());
  const writer = socket.writable.getWriter();
  const command = async (value: string, accepted: number[]) => {
    await writer.write(new TextEncoder().encode(`${value}\r\n`));
    const reply = await reader.reply();
    if (!accepted.includes(reply.code)) throw new Error(`SMTP ${reply.code}`);
  };
  try {
    const greeting = await reader.reply();
    if (greeting.code !== 220) throw new Error(`SMTP ${greeting.code}`);
    await command("EHLO beenhere.arr2018.dpdns.org", [250]);
    await command("AUTH LOGIN", [334]);
    await command(base64(env.SMTP_USERNAME), [334]);
    await command(base64(env.SMTP_PASSWORD), [235]);
    await command(`MAIL FROM:<${env.SMTP_USERNAME}>`, [250]);
    await command(`RCPT TO:<${email.to}>`, [250, 251]);
    await command("DATA", [354]);
    await command(`${formatMessage(env.SMTP_FROM_NAME ?? "来过", env.SMTP_USERNAME, email)}\r\n.`, [250]);
    await command("QUIT", [221]);
  } finally {
    writer.releaseLock(); reader.close(); socket.close();
  }
}
