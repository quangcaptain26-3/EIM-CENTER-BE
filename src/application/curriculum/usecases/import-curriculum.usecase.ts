import type { Pool } from "pg";

import { getLessonPattern } from "../../../domain/curriculum/services/session-type.rule";
import type { CurriculumImportBody } from "../dtos/curriculum-import-export.dto";
import { AppError } from "../../../shared/errors/app-error";

type ImportStats = {
  programsUpserted: number;
  unitsUpserted: number;
  lessonsUpserted: number;
};

export class ImportCurriculumUseCase {
  constructor(private readonly dbPool: Pool) {}

  async execute(body: CurriculumImportBody): Promise<ImportStats> {
    const scope = body.scope;
    const programs = body.programs;

    const client = await this.dbPool.connect();
    const stats: ImportStats = { programsUpserted: 0, unitsUpserted: 0, lessonsUpserted: 0 };

    try {
      await client.query("BEGIN");

      // programCode -> programId
      const programIdByCode = new Map<string, string>();

      for (const program of programs) {
        const lessonsPerUnit = program.lessonsPerUnit ?? 7;
        const sessionsPerWeek = program.sessionsPerWeek ?? 2;
        const feePlanId = program.feePlanId ?? null;

        // Strict scope validation (để contract import rõ ràng)
        if (scope === "program" && program.units) {
          throw AppError.badRequest("Scope=program: không được gửi units trong payload.", {
            code: "CURRICULUM/IMPORT_SCOPE_VIOLATION",
          });
        }
        if (scope === "unit" && !program.units) {
          throw AppError.badRequest("Scope=unit: mỗi program phải có units.", {
            code: "CURRICULUM/IMPORT_SCOPE_VIOLATION",
          });
        }
        if (scope === "lesson" && (!program.units || program.units.length === 0)) {
          throw AppError.badRequest("Scope=lesson: mỗi program phải có units và lessons.", {
            code: "CURRICULUM/IMPORT_SCOPE_VIOLATION",
          });
        }

        const programTotalUnits = program.totalUnits;

        const programUpsertRes = await client.query(
          `
            INSERT INTO curriculum_programs (code, name, level, total_units, lessons_per_unit, sessions_per_week, fee_plan_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (code)
            DO UPDATE SET
              name = EXCLUDED.name,
              level = EXCLUDED.level,
              total_units = EXCLUDED.total_units,
              lessons_per_unit = EXCLUDED.lessons_per_unit,
              sessions_per_week = EXCLUDED.sessions_per_week,
              fee_plan_id = EXCLUDED.fee_plan_id
            RETURNING id;
          `,
          [
            program.code,
            program.name,
            program.level,
            programTotalUnits,
            lessonsPerUnit,
            sessionsPerWeek,
            feePlanId,
          ],
        );

        const programId = String(programUpsertRes.rows[0].id);
        programIdByCode.set(program.code, programId);
        stats.programsUpserted += 1;

        if (scope === "program") continue;

        // units
        const units = program.units ?? [];
        if (units.length !== program.totalUnits) {
          throw AppError.badRequest(
            `Program ${program.code}: totalUnits=${program.totalUnits} nhưng payload units.length=${units.length}`,
            { code: "CURRICULUM/IMPORT_PROGRAM_UNITS_MISMATCH" },
          );
        }

        // Map unitNo -> unitId
        const unitIdByUnitNo = new Map<number, string>();
        const seenUnitNos = new Set<number>();

        for (const unit of units) {
          const unitTotalLessons = unit.totalLessons;

          if (scope === "unit" && unit.lessons) {
            throw AppError.badRequest("Scope=unit: không được gửi lessons trong payload.", {
              code: "CURRICULUM/IMPORT_SCOPE_VIOLATION",
            });
          }

          if (seenUnitNos.has(unit.unitNo)) {
            throw AppError.badRequest(`Program ${program.code}: duplicate unitNo=${unit.unitNo}`, {
              code: "CURRICULUM/IMPORT_DUPLICATE_UNIT_NO",
            });
          }
          seenUnitNos.add(unit.unitNo);

          if (unit.unitNo < 1 || unit.unitNo > program.totalUnits) {
            throw AppError.badRequest(
              `Program ${program.code}: unitNo=${unit.unitNo} ngoài range 1..${program.totalUnits}`,
              { code: "CURRICULUM/IMPORT_UNIT_NO_OUT_OF_RANGE" },
            );
          }

          if (unitTotalLessons !== lessonsPerUnit) {
            // Ràng buộc nghiệp vụ: lessonsPerUnit của program và totalLessons của unit nên khớp.
            // (Nếu muốn hỗ trợ lệch thì phải định nghĩa rõ contract.)
            throw AppError.badRequest(
              `Program ${program.code}: lessonsPerUnit=${lessonsPerUnit} nhưng unitNo=${unit.unitNo} totalLessons=${unitTotalLessons}`,
              { code: "CURRICULUM/IMPORT_LESSONS_PER_UNIT_MISMATCH" },
            );
          }

          const unitUpsertRes = await client.query(
            `
              INSERT INTO curriculum_units (program_id, unit_no, title, total_lessons)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (program_id, unit_no)
              DO UPDATE SET
                title = EXCLUDED.title,
                total_lessons = EXCLUDED.total_lessons
              RETURNING id;
            `,
            [programId, unit.unitNo, unit.title, unitTotalLessons],
          );

          const unitId = String(unitUpsertRes.rows[0].id);
          unitIdByUnitNo.set(unit.unitNo, unitId);
          stats.unitsUpserted += 1;
        }

        // Delete units không nằm trong payload (đảm bảo deterministic + scope chặt chẽ)
        const unitNos = units.map((u) => u.unitNo);
        if (unitNos.length > 0) {
          const placeholders = unitNos.map((_, idx) => `$${idx + 2}`).join(", ");
          await client.query(
            `
              DELETE FROM curriculum_units
              WHERE program_id = $1
                AND unit_no NOT IN (${placeholders});
            `,
            [programId, ...unitNos],
          );
        }

        if (scope === "unit") continue;

        // lessons
        for (const unit of units) {
          const unitId = unitIdByUnitNo.get(unit.unitNo)!;
          const lessons = unit.lessons ?? [];

          if (scope === "lesson" && lessons.length === 0) {
            throw AppError.badRequest(`Program ${program.code}: unitNo=${unit.unitNo} thiếu lessons.`, {
              code: "CURRICULUM/IMPORT_MISSING_LESSONS",
            });
          }

          if (lessons.length !== unit.totalLessons) {
            throw AppError.badRequest(
              `Program ${program.code}: unitNo=${unit.unitNo} totalLessons=${unit.totalLessons} nhưng payload lessons.length=${lessons.length}`,
              { code: "CURRICULUM/IMPORT_UNIT_LESSONS_MISMATCH" },
            );
          }

          // Validate lesson_no trùng + trong range
          const seenLessonNos = new Set<number>();
          for (const l of lessons) {
            if (l.lessonNo < 1 || l.lessonNo > unit.totalLessons) {
              throw AppError.badRequest(
                `Program ${program.code}: unitNo=${unit.unitNo} lessonNo=${l.lessonNo} ngoài range 1..${unit.totalLessons}`,
                { code: "CURRICULUM/IMPORT_LESSON_NO_OUT_OF_RANGE" },
              );
            }
            if (seenLessonNos.has(l.lessonNo)) {
              throw AppError.badRequest(
                `Program ${program.code}: unitNo=${unit.unitNo} có duplicate lessonNo=${l.lessonNo}`,
                { code: "CURRICULUM/IMPORT_DUPLICATE_LESSON_NO" },
              );
            }
            seenLessonNos.add(l.lessonNo);
          }

          const lessonNos = lessons.map((l) => l.lessonNo);
          for (const lesson of lessons) {
            const sessionPattern = lesson.sessionPattern ?? getLessonPattern(lesson.lessonNo);

            const lessonUpsertRes = await client.query(
              `
                INSERT INTO curriculum_unit_lessons (unit_id, lesson_no, title, session_pattern)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (unit_id, lesson_no)
                DO UPDATE SET
                  title = EXCLUDED.title,
                  session_pattern = EXCLUDED.session_pattern
                RETURNING id;
              `,
              [unitId, lesson.lessonNo, lesson.title, sessionPattern],
            );

            void lessonUpsertRes;
            stats.lessonsUpserted += 1;
          }

          // Delete lessons không nằm trong payload để đảm bảo đúng scope
          if (lessonNos.length > 0) {
            const placeholders = lessonNos.map((_, idx) => `$${idx + 2}`).join(", ");
            await client.query(
              `
                DELETE FROM curriculum_unit_lessons
                WHERE unit_id = $1
                  AND lesson_no NOT IN (${placeholders});
              `,
              [unitId, ...lessonNos],
            );
          }
        }
      }

      await client.query("COMMIT");
      return stats;
    } catch (e) {
      await client.query("ROLLBACK");
      // Không lộ stack DB, chỉ ném message rõ ràng cho FE/ops
      throw e;
    } finally {
      client.release();
    }
  }
}

