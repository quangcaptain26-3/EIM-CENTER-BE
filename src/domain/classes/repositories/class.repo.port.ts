import { ClassEntity } from '../entities/class.entity';
import { ProgramEntity } from '../entities/program.entity';
import { RoomEntity } from '../entities/room.entity';

/** Hàng danh sách lớp — camelCase khớp FE / ClassResponse (list). */
export interface ClassListRow {
  id: string;
  classCode: string;
  programId: string;
  programCode: string | null;
  programName: string | null;
  roomId: string;
  roomCode: string | null;
  shift: 1 | 2;
  scheduleDays: number[];
  minCapacity: number;
  maxCapacity: number;
  status: 'pending' | 'active' | 'closed';
  startDate: string | null;
  mainTeacherId: string | null;
  mainTeacherName: string | null;
  enrollmentCount: number;
  completedSessions: number;
  totalSessions: number;
}

export interface IClassRepo {
  findById(id: string): Promise<ClassEntity | null>;
  findByCode(code: string): Promise<ClassEntity | null>;
  findAll(
    filter: {
      programCode?: string;
      programId?: string;
      status?: 'pending' | 'active' | 'closed';
      roomId?: string;
      teacherId?: string;
      shift?: 1 | 2;
      search?: string;
    },
    paginate: { limit: number; offset: number }
  ): Promise<{ data: ClassListRow[]; total: number }>;
  create(data: Partial<ClassEntity>): Promise<ClassEntity>;
  update(id: string, data: Partial<ClassEntity>): Promise<ClassEntity>;
  updateStatus(id: string, status: 'pending' | 'active' | 'closed'): Promise<boolean>;
}

export interface IClassStaffRepo {
  findActiveByClass(classId: string): Promise<any[]>;
  create(data: any): Promise<any>;
  closeRecord(id: string, toSession: number): Promise<boolean>;
}

export interface IRoomRepo {
  findById(id: string): Promise<RoomEntity | null>;
  findByCode(code: string): Promise<RoomEntity | null>;
  findAll(): Promise<RoomEntity[]>;
  create(data: Partial<RoomEntity>): Promise<RoomEntity>;
}

export interface IProgramRepo {
  findById(id: string): Promise<ProgramEntity | null>;
  findByCode(code: string): Promise<ProgramEntity | null>;
  findAll(): Promise<ProgramEntity[]>;
  findByLevelOrder(level: number): Promise<ProgramEntity | null>;
}
