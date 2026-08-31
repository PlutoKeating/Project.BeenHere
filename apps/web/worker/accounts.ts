import { createOpaqueToken, hashOpaqueToken, hashPassword, hashSessionToken, verifyPassword } from "./auth-crypto";
import { HttpError, sessionCookie } from "./http";
import { sendEmail } from "./smtp";
import type { Account, Env } from "./types";

type AccountRow = { id: string; email: string; display_name: string; password_credential: string | null; role: Account["role"]; status: Account["status"] };
type ActionKind = "verify_email" | "reset_password" | "change_email" | "delete_account";
type ActionRow = { token_hash: string; account_id: string; kind: ActionKind; payload: string; expires_at: string; consumed_at: string | null };
const expiry = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const map = (row: AccountRow): Account => ({ id: row.id, email: row.email, displayName: row.display_name, role: row.role, status: row.status });

export class AccountModule {
  constructor(private readonly db: D1Database, private readonly env: Env) {}

  private rowByEmail(email: string) { return this.db.prepare("SELECT id,email,display_name,password_credential,role,status FROM accounts WHERE email=? COLLATE NOCASE").bind(email.trim().toLowerCase()).first<AccountRow>(); }
  private rowById(id: string) { return this.db.prepare("SELECT id,email,display_name,password_credential,role,status FROM accounts WHERE id=?").bind(id).first<AccountRow>(); }
  private roleFor(email: string): Account["role"] { return (this.env.SUPERADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).includes(email.toLowerCase()) ? "director" : "member"; }

  private async action(accountId: string, kind: ActionKind, payload: object): Promise<string> {
    const token = createOpaqueToken(), hash = await hashOpaqueToken(token);
    await this.db.batch([
      this.db.prepare("DELETE FROM account_actions WHERE account_id=? AND kind=? AND consumed_at IS NULL").bind(accountId, kind),
      this.db.prepare("INSERT INTO account_actions(token_hash,account_id,kind,payload,expires_at) VALUES(?,?,?,?,?)").bind(hash, accountId, kind, JSON.stringify(payload), expiry(30)),
    ]);
    return token;
  }

  private async readAction(token: string, kind: ActionKind): Promise<ActionRow> {
    const row = await this.db.prepare("SELECT token_hash,account_id,kind,payload,expires_at,consumed_at FROM account_actions WHERE token_hash=? AND kind=?").bind(await hashOpaqueToken(token), kind).first<ActionRow>();
    if (!row || row.consumed_at || Date.parse(row.expires_at) <= Date.now()) throw new HttpError(400, "invalid_or_expired_token", "验证链接无效或已过期。");
    return row;
  }
  private async mail(to: string, subject: string, heading: string, description: string, path: string, token: string) {
    const link = `${this.env.SITE_URL}${path}?token=${encodeURIComponent(token)}`;
    await sendEmail(this.env, { to, subject, text: `${heading}\n\n${description}\n\n${link}\n\n链接将在 30 分钟后失效。`, html: `<div style="font-family:system-ui;line-height:1.8;color:#25231f"><h1>${heading}</h1><p>${description}</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#25231f;color:#fff;text-decoration:none">继续操作</a></p><p style="color:#777">链接将在 30 分钟后失效。如果不是你本人操作，请忽略。</p></div>` });
  }

  async rateLimit(request: Request, action: string, limit = 5) {
    const bucket = Math.floor(Date.now() / 900_000), ip = request.headers.get("cf-connecting-ip") ?? "local";
    const id = await hashOpaqueToken(`${ip}:${action}:${bucket}`), until = new Date((bucket + 1) * 900_000).toISOString();
    const row = await this.db.prepare("INSERT INTO auth_rate_limits(id,request_count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET request_count=request_count+1 RETURNING request_count").bind(id, until).first<{ request_count: number }>();
    if ((row?.request_count ?? limit + 1) > limit) throw new HttpError(429, "too_many_requests", "尝试次数过多，请稍后再试。");
  }

  async register(email: string, displayName: string, password: string) {
    const normalized = email.trim().toLowerCase(); let row = await this.rowByEmail(normalized);
    if (row && row.status !== "pending") throw new HttpError(409, "email_already_registered", "该邮箱已注册，请直接登录或找回密码。");
    const credential = await hashPassword(password);
    if (!row) { const id = `account-${crypto.randomUUID()}`; await this.db.prepare("INSERT INTO accounts(id,email,display_name,password_credential,role,status) VALUES(?,?,?,?,?,'pending')").bind(id, normalized, displayName, credential, this.roleFor(normalized)).run(); row = await this.rowById(id); }
    else await this.db.prepare("UPDATE accounts SET display_name=?,password_credential=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(displayName, credential, row.id).run();
    const token = await this.action(row!.id, "verify_email", {});
    try { await this.mail(normalized, "验证你的来过账户", "完成邮箱验证", "你正在注册来过账户。", "/auth/verify-email", token); }
    catch (error) { await this.db.prepare("DELETE FROM account_actions WHERE token_hash=?").bind(await hashOpaqueToken(token)).run(); throw error; }
  }

  async verifyEmail(token: string) {
    const action = await this.readAction(token, "verify_email");
    const results = await this.db.batch([this.db.prepare("UPDATE account_actions SET consumed_at=CURRENT_TIMESTAMP WHERE token_hash=? AND consumed_at IS NULL").bind(action.token_hash), this.db.prepare("UPDATE accounts SET status='active',email_verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(action.account_id), this.db.prepare("DELETE FROM account_actions WHERE account_id=? AND token_hash<>?").bind(action.account_id, action.token_hash)]);
    if (!results[0]?.meta.changes || !results[1]?.meta.changes) throw new HttpError(409, "account_not_pending", "账户无法完成验证。");
    const row = await this.rowById(action.account_id); if (!row || row.status !== "active") throw new HttpError(409, "account_not_pending", "账户无法完成验证。");
    return { account: map(row), token: await this.createSession(row.id) };
  }

  private async createSession(accountId: string) { const token = createOpaqueToken(); await this.db.prepare("INSERT INTO account_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)").bind(await hashSessionToken(token, this.env.SESSION_SECRET), accountId, expiry(43_200)).run(); return token; }
  async authenticate(request: Request): Promise<Account> {
    const token = sessionCookie(request); if (!token) throw new HttpError(401, "account_auth_required", "请先登录。");
    const row = await this.db.prepare("SELECT a.id,a.email,a.display_name,a.password_credential,a.role,a.status FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND datetime(s.expires_at)>CURRENT_TIMESTAMP").bind(await hashSessionToken(token, this.env.SESSION_SECRET)).first<AccountRow>();
    if (!row || row.status !== "active") throw new HttpError(401, "account_auth_required", "登录已失效，请重新登录。"); return map(row);
  }

  async login(email: string, password: string) {
    const row = await this.rowByEmail(email);
    if (!row?.password_credential || !(await verifyPassword(password, row.password_credential))) throw new HttpError(401, "invalid_credentials", "邮箱或密码不正确。");
    if (row.status === "pending") throw new HttpError(403, "email_not_verified", "请先完成邮箱验证。");
    if (row.status !== "active") throw new HttpError(403, "account_unavailable", "该账户当前不可用。");
    await this.db.prepare("UPDATE accounts SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id).run(); return { account: map(row), token: await this.createSession(row.id) };
  }
  async logout(request: Request) { const token = sessionCookie(request); if (token) await this.db.prepare("DELETE FROM account_sessions WHERE token_hash=?").bind(await hashSessionToken(token, this.env.SESSION_SECRET)).run(); }

  async forgotPassword(email: string) { const row = await this.rowByEmail(email); if (!row || row.status !== "active") return; const token = await this.action(row.id, "reset_password", {}); try { await this.mail(row.email, "重设你的来过密码", "重设密码", "我们收到了重设密码的请求。", "/auth/reset-password", token); } catch (error) { await this.db.prepare("DELETE FROM account_actions WHERE token_hash=?").bind(await hashOpaqueToken(token)).run(); console.error("Password reset email delivery failed", error); } }
  async resetPassword(token: string, password: string) { const action = await this.readAction(token, "reset_password"), credential = await hashPassword(password); const results = await this.db.batch([this.db.prepare("UPDATE account_actions SET consumed_at=CURRENT_TIMESTAMP WHERE token_hash=? AND consumed_at IS NULL").bind(action.token_hash), this.db.prepare("UPDATE accounts SET password_credential=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'").bind(credential, action.account_id), this.db.prepare("DELETE FROM account_sessions WHERE account_id=?").bind(action.account_id), this.db.prepare("DELETE FROM account_actions WHERE account_id=? AND token_hash<>?").bind(action.account_id, action.token_hash)]); if (!results[0]?.meta.changes || !results[1]?.meta.changes) throw new HttpError(409, "account_unavailable", "账户当前不可用。"); const row = await this.rowById(action.account_id); if (!row || row.status !== "active") throw new HttpError(409, "account_unavailable", "账户当前不可用。"); return { account: map(row), token: await this.createSession(row.id) }; }
  async updateProfile(account: Account, name: string) { await this.db.prepare("UPDATE accounts SET display_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name, account.id).run(); return { ...account, displayName: name }; }
  async changePassword(account: Account, current: string, next: string) { const row = await this.rowById(account.id); if (!row?.password_credential || !(await verifyPassword(current, row.password_credential))) throw new HttpError(401, "invalid_password", "当前密码不正确。"); await this.db.batch([this.db.prepare("UPDATE accounts SET password_credential=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(await hashPassword(next), account.id), this.db.prepare("DELETE FROM account_sessions WHERE account_id=?").bind(account.id), this.db.prepare("DELETE FROM account_actions WHERE account_id=?").bind(account.id)]); return this.createSession(account.id); }
  async requestEmailChange(account: Account, password: string, email: string) { const row = await this.rowById(account.id); if (!row?.password_credential || !(await verifyPassword(password, row.password_credential))) throw new HttpError(401, "invalid_password", "当前密码不正确。"); const normalized = email.trim().toLowerCase(); if (await this.rowByEmail(normalized)) throw new HttpError(409, "email_already_registered", "该邮箱已被使用。"); const token = await this.action(account.id, "change_email", { email: normalized }); try { await this.mail(normalized, "确认新的来过邮箱", "确认新邮箱", "确认后，这个邮箱将用于登录来过。", "/auth/confirm-email-change", token); } catch (e) { await this.db.prepare("DELETE FROM account_actions WHERE token_hash=?").bind(await hashOpaqueToken(token)).run(); throw e; } }
  async confirmEmailChange(token: string) { const action = await this.readAction(token, "change_email"), email = (JSON.parse(action.payload) as {email?:string}).email; if (!email || await this.rowByEmail(email)) throw new HttpError(409, "email_already_registered", "该邮箱已被使用。"); const results = await this.db.batch([this.db.prepare("UPDATE account_actions SET consumed_at=CURRENT_TIMESTAMP WHERE token_hash=? AND consumed_at IS NULL").bind(action.token_hash), this.db.prepare("UPDATE accounts SET email=?,email_verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'").bind(email, action.account_id), this.db.prepare("DELETE FROM account_sessions WHERE account_id=?").bind(action.account_id), this.db.prepare("DELETE FROM account_actions WHERE account_id=? AND token_hash<>?").bind(action.account_id, action.token_hash)]); if (!results[0]?.meta.changes || !results[1]?.meta.changes) throw new HttpError(409, "account_unavailable", "账户当前不可用。"); }
  async requestDeletion(account: Account) { const token = await this.action(account.id, "delete_account", {}); try { await this.mail(account.email, "确认删除来过账户", "删除账户", "确认后账户资料和登录凭据将被移除；已发布采访记录会保留。", "/auth/confirm-deletion", token); } catch (e) { await this.db.prepare("DELETE FROM account_actions WHERE token_hash=?").bind(await hashOpaqueToken(token)).run(); throw e; } }
  async confirmDeletion(token: string) { const action = await this.readAction(token, "delete_account"); const results = await this.db.batch([this.db.prepare("UPDATE account_actions SET consumed_at=CURRENT_TIMESTAMP WHERE token_hash=? AND consumed_at IS NULL").bind(action.token_hash), this.db.prepare("DELETE FROM account_sessions WHERE account_id=?").bind(action.account_id), this.db.prepare("UPDATE accounts SET email=?,display_name='已删除账户',password_credential=NULL,status='deleted',deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'").bind(`deleted+${action.account_id}@invalid.local`, action.account_id), this.db.prepare("DELETE FROM account_actions WHERE account_id=?").bind(action.account_id)]); if (!results[0]?.meta.changes || !results[2]?.meta.changes) throw new HttpError(409, "account_unavailable", "账户当前不可用。"); }
  requireDirector(account: Account) { if (account.role !== "director") throw new HttpError(403, "director_required", "此操作仅限馆长。"); }
  async list() { const rows = await this.db.prepare("SELECT id,email,display_name,password_credential,role,status FROM accounts WHERE status!='deleted' ORDER BY created_at DESC").all<AccountRow>(); return rows.results.map(map); }
  async setStatus(id: string, status: "active" | "suspended") { const row = await this.rowById(id); if (!row) throw new HttpError(404, "account_not_found", "没有找到该账户。"); if (row.role === "director") throw new HttpError(409, "director_status_protected", "馆长账户不能在此停用。"); await this.db.prepare("UPDATE accounts SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('active','suspended')").bind(status, id).run(); if (status === "suspended") await this.db.prepare("DELETE FROM account_sessions WHERE account_id=?").bind(id).run(); }
}
