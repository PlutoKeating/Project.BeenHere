import { HttpError } from "./http";
import type { Account, Env } from "./types";

type AccountRow = { id: string; email: string; display_name: string; role: Account["role"]; status: Account["status"] };

function map(row: AccountRow): Account {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role, status: row.status };
}

export class AccountModule {
  constructor(private readonly db: D1Database, private readonly env: Env) {}

  async resolve(email: string): Promise<Account> {
    const normalized = email.trim().toLowerCase();
    const directors = (this.env.SUPERADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    const desiredRole = directors.includes(normalized) ? "director" : "member";
    let row = await this.db.prepare("SELECT id, email, display_name, role, status FROM accounts WHERE email = ? COLLATE NOCASE").bind(normalized).first<AccountRow>();
    if (!row) {
      const id = `account-${crypto.randomUUID()}`;
      const displayName = normalized.split("@")[0] || "新用户";
      await this.db.prepare("INSERT INTO accounts (id, email, display_name, role) VALUES (?, ?, ?, ?)").bind(id, normalized, displayName, desiredRole).run();
      row = { id, email: normalized, display_name: displayName, role: desiredRole, status: "active" };
    } else {
      await this.db.prepare("UPDATE accounts SET last_seen_at = CURRENT_TIMESTAMP, role = ? WHERE id = ?").bind(desiredRole, row.id).run();
      row.role = desiredRole;
    }
    if (row.status === "suspended") throw new HttpError(403, "account_suspended", "该账户已被停用。\n");
    return map(row);
  }

  requireDirector(account: Account): void {
    if (account.role !== "director") throw new HttpError(403, "director_required", "此操作仅限馆长。\n");
  }

  async updateProfile(account: Account, displayName: string): Promise<Account> {
    await this.db.prepare("UPDATE accounts SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(displayName, account.id).run();
    return { ...account, displayName };
  }

  async list(): Promise<Account[]> {
    const rows = await this.db.prepare("SELECT id, email, display_name, role, status FROM accounts ORDER BY created_at DESC").all<AccountRow>();
    return rows.results.map(map);
  }

  async setStatus(accountId: string, status: Account["status"]): Promise<void> {
    const target = await this.db.prepare("SELECT role FROM accounts WHERE id = ?").bind(accountId).first<{ role: Account["role"] }>();
    if (!target) throw new HttpError(404, "account_not_found", "没有找到该账户。\n");
    if (target.role === "director") throw new HttpError(409, "director_status_protected", "馆长账户不能在此停用。\n");
    const result = await this.db.prepare("UPDATE accounts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, accountId).run();
    if (!result.meta.changes) throw new HttpError(409, "account_status_unchanged", "账户状态没有变化。\n");
  }
}
