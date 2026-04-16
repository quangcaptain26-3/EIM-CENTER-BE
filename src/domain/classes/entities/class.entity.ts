export class ClassEntity {
  id!: string;
  classCode!: string;
  programId!: string;
  roomId!: string;
  shift!: 1 | 2;
  scheduleDays!: number[];
  minCapacity!: number;
  maxCapacity!: number;
  status!: 'pending' | 'active' | 'closed';
  startDate?: Date;
  createdBy?: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<ClassEntity>) {
    Object.assign(this, partial);
  }

  getShiftLabel(): string {
    if (this.shift === 1) return 'Ca 1 (18:00–19:30)';
    if (this.shift === 2) return 'Ca 2 (19:30–21:00)';
    return '';
  }

  getScheduleLabel(): string {
    if (!this.scheduleDays || !this.scheduleDays.length) return '';
    return this.scheduleDays
      .map((day) => (day === 8 ? 'Chủ nhật' : `Thứ ${day}`))
      .join(', ');
  }
}
