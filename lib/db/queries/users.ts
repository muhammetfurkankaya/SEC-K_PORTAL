import { getDb } from "@/lib/db";
import type { AdminUser } from "@/lib/types";

export function getUserByUsername(username: string): AdminUser | undefined {
  return getDb()
    .prepare(`SELECT * FROM admin_users WHERE username = ? AND is_active = 1`)
    .get(username) as AdminUser | undefined;
}

export function getUserById(id: number): AdminUser | undefined {
  return getDb()
    .prepare(`SELECT * FROM admin_users WHERE id = ? AND is_active = 1`)
    .get(id) as AdminUser | undefined;
}

export function createUser(input: {
  username: string;
  password_hash: string;
  full_name?: string | null;
  role?: string;
}): number {
  const result = getDb()
    .prepare(
      `INSERT INTO admin_users (username, password_hash, full_name, role)
       VALUES (?, ?, ?, ?)`,
    )
    .run(
      input.username,
      input.password_hash,
      input.full_name ?? null,
      input.role ?? "admin",
    );
  return Number(result.lastInsertRowid);
}

export function updatePassword(id: number, passwordHash: string): void {
  getDb().prepare(`UPDATE admin_users SET password_hash = ? WHERE id = ?`).run(passwordHash, id);
}

export function touchLastLogin(id: number): void {
  getDb()
    .prepare(`UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?`)
    .run(id);
}

export function countUsers(): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM admin_users`).get() as { n: number };
  return row.n;
}
