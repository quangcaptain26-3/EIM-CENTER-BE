export class RoomEntity {
  id!: string;
  roomCode!: string;
  capacity!: number;
  isActive!: boolean;
  createdAt!: Date;
  /** Tầng 1 | 2 — có thể null trên dữ liệu cũ */
  floor?: number | null;
  roomType?: 'normal' | 'large';
  amenities?: Record<string, unknown>;

  constructor(partial: Partial<RoomEntity>) {
    Object.assign(this, partial);
  }
}
