import { Pool } from 'pg';

export async function refreshSearchViews(db: Pool): Promise<void> {
  try {
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_students');
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_users');
  } catch (err) {
    console.error('Failed to refresh search views:', err);
  }
}
