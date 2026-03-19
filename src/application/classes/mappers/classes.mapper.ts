import { Class } from "../../../domain/classes/entities/class.entity";
import { ClassSchedule } from "../../../domain/classes/entities/class.entity";
import { ClassStaff } from "../../../domain/classes/entities/class-staff.entity";
import { RosterStudent } from "../../../domain/classes/repositories/roster.repo.port";

export const ClassMapper = {
  toResponse(entity: Class) {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      programId: entity.programId,
      programName: entity.programName ?? null,
      room: entity.room,
      capacity: entity.capacity,
      currentSize: entity.currentSize ?? 0,
      startDate: entity.startDate,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
    };
  },

  toScheduleResponse(entity: ClassSchedule) {
    return {
      id: entity.id,
      classId: entity.classId,
      weekday: entity.weekday,
      startTime: entity.startTime,
      endTime: entity.endTime,
    };
  },

  toStaffResponse(entity: ClassStaff) {
    return {
      id: entity.id,
      classId: entity.classId,
      userId: entity.userId,
      userFullName: entity.userFullName ?? null,
      type: entity.type,
      assignedAt: entity.assignedAt.toISOString(),
    };
  },

  toRosterResponse(entity: RosterStudent) {
    return {
      studentId: entity.studentId,
      fullName: entity.fullName,
      status: entity.status,
    };
  },

  toDetailResponse(
    entity: Class,
    schedules: ClassSchedule[],
    staff: ClassStaff[]
  ) {
    return {
      ...this.toResponse(entity),
      schedules: schedules.map((s) => this.toScheduleResponse(s)),
      staff: staff.map((s) => this.toStaffResponse(s)),
    };
  },
};
