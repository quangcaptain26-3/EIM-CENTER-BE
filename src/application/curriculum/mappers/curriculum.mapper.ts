import { Program } from '../../../domain/curriculum/entities/program.entity';
import { Unit, UnitLesson } from '../../../domain/curriculum/entities/unit.entity';

/**
 * Lớp chịu trách nhiệm biến đổi dữ liệu từ Domain Entity 
 * sang dạng Response cho client (chuẩn camelCase, ẩn những field nhạy cảm nếu có).
 */
export class CurriculumMapper {
  
  /**
   * Map một Program
   */
  static toProgramResponse(program: Program) {
    return {
      id: program.id,
      code: program.code,
      name: program.name,
      level: program.level,
      totalUnits: program.totalUnits,
      lessonsPerUnit: program.lessonsPerUnit,
      sessionsPerWeek: program.sessionsPerWeek,
      feePlanId: program.feePlanId,
      createdAt: program.createdAt,
    };
  }

  /**
   * Map một Unit (chỉ chứa metadata của unit, không kèm list lesson)
   */
  static toUnitResponse(unit: Unit) {
    return {
      id: unit.id,
      programId: unit.programId,
      unitNo: unit.unitNo,
      title: unit.title,
      totalLessons: unit.totalLessons,
      createdAt: unit.createdAt,
    };
  }

  /**
   * Map một Lesson
   */
  static toLessonResponse(lesson: UnitLesson) {
    return {
      id: lesson.id,
      unitId: lesson.unitId,
      lessonNo: lesson.lessonNo,
      title: lesson.title,
      sessionPattern: lesson.sessionPattern,
      createdAt: lesson.createdAt,
    };
  }

  /**
   * Map Unit kèm danh sách Lessons
   */
  static toUnitWithLessonsResponse(unit: Unit, lessons: UnitLesson[]) {
    return {
      ...CurriculumMapper.toUnitResponse(unit),
      lessons: lessons.map(lesson => CurriculumMapper.toLessonResponse(lesson))
    };
  }
}
