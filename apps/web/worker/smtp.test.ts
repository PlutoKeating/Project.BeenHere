import { describe, expect, it } from "vitest";
import { formatMessage } from "./smtp";

describe("SMTP message", () => {
  it("encodes Chinese headers and dot-stuffs message bodies", () => {
    const message = formatMessage("来过", "beenhere@yeah.net", { to: "reader@example.com", subject: "验证邮箱", text: ".hello", html: ".<p>hello</p>" });
    expect(message).toContain("Subject: =?UTF-8?B?");
    expect(message).toContain("\r\n..hello\r\n");
    expect(message).not.toContain("SMTP_PASSWORD");
  });
});
