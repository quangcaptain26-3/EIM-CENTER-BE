import { Student } from "../../../domain/students/entities/student.entity";
import { Enrollment, EnrollmentHistory } from "../../../domain/students/entities/enrollment.entity";

/**
 * Mapper chuyển đổi các Entities liên quan đến Học viên sang format camelCase cho Response
 */
export class StudentsMapper {
  static toStudentResponse(student: Student) {
    return {
      id: student.id,
      fullName: student.fullName,
      dob: student.dob ? student.dob.toISOString() : null,
      gender: student.gender || null,
      phone: student.phone || null,
      email: student.email || null,
      guardianName: student.guardianName || null,
      guardianPhone: student.guardianPhone || null,
      address: student.address || null,
      createdAt: student.createdAt.toISOString(),
      // Enrollment hiện tại (lớp đang học) — dùng cho search-and-pick khi add vào lớp
      currentEnrollment: student.currentEnrollment ?? null,
    };
  }

  static toEnrollmentResponse(enrollment: Enrollment) {
    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      classId: enrollment.classId,
      classCode: enrollment.classCode ?? null,
      programId: enrollment.programId ?? null,
      status: enrollment.status,
      startDate: enrollment.startDate.toISOString(),
      endDate: enrollment.endDate ? enrollment.endDate.toISOString() : null,
      currentUnitNo: enrollment.currentUnitNo ?? null,
      currentLessonNo: enrollment.currentLessonNo ?? null,
      createdAt: enrollment.createdAt.toISOString(),
    };
  }

  static toEnrollmentHistoryResponse(history: EnrollmentHistory) {
    return {
      id: history.id,
      enrollmentId: history.enrollmentId,
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      note: history.note || null,
      changedBy: history.changedBy ?? null,
      fromClassId: history.fromClassId ?? null,
      toClassId: history.toClassId ?? null,
      changedAt: history.changedAt.toISOString(),
    };
  }
}
