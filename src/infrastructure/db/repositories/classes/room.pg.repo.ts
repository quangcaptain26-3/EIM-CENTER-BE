import { IRoomRepo } from '../../../../domain/classes/repositories/class.repo.port';
import { RoomEntity } from '../../../../domain/classes/entities/room.entity';

export class RoomPgRepo implements IRoomRepo {
  constructor(private readonly db: any) {}

  async findById(id: string): Promise<RoomEntity | null> {
    const result = await this.db.query(`SELECT * FROM rooms WHERE id = $1`, [id]);
    if (!result.rows[0]) return null;
    return new RoomEntity(result.rows[0]);
  }

  async findByCode(code: string): Promise<RoomEntity | null> {
    const result = await this.db.query(`SELECT * FROM rooms WHERE room_code = $1`, [code]);
    if (!result.rows[0]) return null;
    return new RoomEntity(result.rows[0]);
  }

  async findAll(): Promise<RoomEntity[]> {
    const result = await this.db.query(`SELECT * FROM rooms ORDER BY room_code ASC`);
    return result.rows.map((row: any) => new RoomEntity(row));
  }

  async create(data: Partial<RoomEntity>): Promise<RoomEntity> {
    const result = await this.db.query(
      `INSERT INTO rooms (room_code, capacity, is_active) VALUES ($1, $2, $3) RETURNING *`,
      [data.roomCode, data.capacity, data.isActive !== undefined ? data.isActive : true]
    );
    return new RoomEntity(result.rows[0]);
  }
}
