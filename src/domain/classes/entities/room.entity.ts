export class RoomEntity {
  id!: string;
  roomCode!: string;
  capacity!: number;
  isActive!: boolean;
  createdAt!: Date;

  constructor(partial: Partial<RoomEntity>) {
    Object.assign(this, partial);
  }
}
