import { IRoomRepo } from '../../../../domain/classes/repositories/class.repo.port';
import { RoomEntity } from '../../../../domain/classes/entities/room.entity';

export class RoomPgRepo implements IRoomRepo {
  constructor(private readonly db: any) {}

  private static readonly ROOM_SELECT = `
    SELECT
      id,
      room_code AS "roomCode",
      capacity,
      is_active AS "isActive",
      created_at AS "createdAt",
      floor,
      room_type AS "roomType",
      amenities
    FROM rooms
  `;

  async findById(id: string): Promise<RoomEntity | null> {
    const result = await this.db.query(`${RoomPgRepo.ROOM_SELECT} WHERE id = $1`, [id]);
    if (!result.rows[0]) return null;
    return new RoomEntity(result.rows[0]);
  }

  async findByCode(code: string): Promise<RoomEntity | null> {
    const result = await this.db.query(`${RoomPgRepo.ROOM_SELECT} WHERE room_code = $1`, [code]);
    if (!result.rows[0]) return null;
    return new RoomEntity(result.rows[0]);
  }

  async findAll(): Promise<RoomEntity[]> {
    const result = await this.db.query(`${RoomPgRepo.ROOM_SELECT} ORDER BY floor NULLS LAST, room_code ASC`);
    return result.rows.map((row: any) => new RoomEntity(row));
  }

  async create(data: Partial<RoomEntity>): Promise<RoomEntity> {
    const result = await this.db.query(
      `INSERT INTO rooms (room_code, capacity, is_active, floor, room_type, amenities)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'normal'), COALESCE($6::jsonb, '{}'::jsonb))
       RETURNING id`,
      [
        data.roomCode,
        data.capacity,
        data.isActive !== undefined ? data.isActive : true,
        data.floor ?? null,
        data.roomType ?? 'normal',
        data.amenities != null ? JSON.stringify(data.amenities) : null,
      ],
    );
    const created = await this.findById(String(result.rows[0].id));
    if (!created) throw new Error('Room insert failed');
    return created;
  }
}
