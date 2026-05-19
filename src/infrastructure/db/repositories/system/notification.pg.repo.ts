import { Pool } from 'pg';

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

function mapRow(r: Record<string, unknown>): NotificationRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    type: String(r.type),
    title: String(r.title),
    body: String(r.body ?? ''),
    read: Boolean(r.read),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at as Date,
  };
}

export class NotificationPgRepo {
  constructor(private readonly db: Pool) {}

  async create(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationRow> {
    const { rows } = await this.db.query(
      `
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING *
      `,
      [
        input.userId,
        input.type,
        input.title,
        input.body,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return mapRow(rows[0] as Record<string, unknown>);
  }

  async listForUser(userId: string, limit: number): Promise<NotificationRow[]> {
    const { rows } = await this.db.query(
      `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [userId, limit],
    );
    return rows.map((r) => mapRow(r as Record<string, unknown>));
  }

  async countUnread(userId: string): Promise<number> {
    const { rows } = await this.db.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read = FALSE`,
      [userId],
    );
    return Number((rows[0] as { c: number })?.c ?? 0);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
      [userId],
    );
  }
}
