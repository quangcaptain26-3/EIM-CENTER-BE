import { AppError } from "../../../shared/errors/app-error";
import { ConvertTrialBody, ConvertTrialSchema } from "../dtos/convert.dto";
import { ConvertTrialRule } from "../../../domain/trials/services/convert-trial.rule";
import type { TrialStatus } from "../../../domain/trials/entities/trial-lead.entity";
import { pool } from "../../../infrastructure/db/pg-pool";

export class ConvertTrialUseCase {
  async execute(trialId: string, data: ConvertTrialBody, actorUserId?: string) {
    const validated = ConvertTrialSchema.parse(data);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1) Lock TrialLead — chống convert lặp (race)
      const leadRes = await client.query(
        `SELECT id, full_name, phone, email, status, note FROM trial_leads WHERE id = $1 FOR UPDATE`,
        [trialId],
      );
      if (leadRes.rows.length === 0) {
        throw AppError.notFound("Không tìm thấy TrialLead");
      }
      const leadRow = leadRes.rows[0] as {
        id: string;
        full_name: string;
        phone: string;
        email: string | null;
        status: string;
        note: string | null;
      };

      // 2) Rule convert: không phải CONVERTED / CLOSED (dùng status từ row đã lock)
      if (!ConvertTrialRule.isConvertible({ status: leadRow.status as TrialStatus })) {
        throw AppError.badRequest("TrialLead không đủ điều kiện để chuyển đổi (đã chuyển đổi hoặc đã đóng).", {
          code: "TRIAL/NOT_CONVERTIBLE",
          status: leadRow.status,
        });
      }

      // 3) Validate class nếu có classId
      if (validated.classId) {
        const classRes = await client.query(
          `SELECT id, status, capacity FROM classes WHERE id = $1 FOR UPDATE`,
          [validated.classId],
        );
        if (classRes.rows.length === 0) {
          throw AppError.badRequest("Class không tồn tại", { code: "TRIAL/CLASS_NOT_FOUND" });
        }
        const cls = classRes.rows[0] as { status: string; capacity: number };
        if (cls.status !== "ACTIVE") {
          throw AppError.badRequest("Không thể convert vào lớp không ở trạng thái ACTIVE", {
            code: "TRIAL/CLASS_NOT_ACTIVE",
            status: cls.status,
          });
        }
        const countRes = await client.query(
          `SELECT COUNT(*)::INT AS cnt FROM enrollments WHERE class_id = $1 AND status = 'ACTIVE'`,
          [validated.classId],
        );
        const activeCount = Number(countRes.rows[0]?.cnt ?? 0);
        if (activeCount >= cls.capacity) {
          throw AppError.badRequest("Khóa học đã đạt giới hạn học viên (capacity)", {
            code: "TRIAL/CLASS_FULL",
            capacity: cls.capacity,
            activeCount,
          });
        }
      }

      // 4) Dedup: tìm student trùng theo phone, email, guardian_phone — reuse nếu trùng, không tạo duplicate
      const phone = (validated.student.phone || leadRow.phone || "").trim();
      const emailRaw = validated.student.email ?? leadRow.email;
      const email = emailRaw ? String(emailRaw).trim().toLowerCase() : null;
      const guardianPhone = validated.student.guardianPhone
        ? String(validated.student.guardianPhone).trim()
        : null;
      const fullName = (validated.student.fullName || leadRow.full_name || "").trim();

      if (!phone) {
        throw AppError.badRequest("Thiếu số điện thoại học viên khi convert", {
          code: "TRIAL/STUDENT_PHONE_REQUIRED",
        });
      }
      if (!fullName) {
        throw AppError.badRequest("Thiếu họ tên học viên khi convert", {
          code: "TRIAL/STUDENT_FULLNAME_REQUIRED",
        });
      }

      const dupRes = await client.query(
        `
          SELECT id FROM students
          WHERE ($1::TEXT IS NOT NULL AND LENGTH(TRIM($1)) > 0 AND phone = $1)
             OR ($2::TEXT IS NOT NULL AND LENGTH(TRIM($2)) > 0 AND LOWER(email) = $2)
             OR ($3::TEXT IS NOT NULL AND LENGTH(TRIM($3)) > 0 AND guardian_phone = $3)
          LIMIT 1
        `,
        [phone, email ?? null, guardianPhone],
      );
      const dupStudentId = dupRes.rows.length > 0 ? String(dupRes.rows[0].id) : null;

      let studentId: string;

      if (validated.existingStudentId) {
        // Dùng student có sẵn — phải trùng với kết quả dedup
        if (!dupStudentId) {
          throw AppError.badRequest(
            "existingStudentId được gửi nhưng không tìm thấy student trùng phone/email/guardian_phone. Chỉ dùng existingStudentId khi đã phát hiện trùng.",
            { code: "TRIAL/EXISTING_STUDENT_NO_MATCH" },
          );
        }
        if (validated.existingStudentId !== dupStudentId) {
          throw AppError.conflict("Học viên đã tồn tại (trùng phone/email/guardian_phone). Gửi existingStudentId đúng ID student trùng để dùng.", {
            code: "TRIAL/DUPLICATE_STUDENT",
            existingStudentId: dupStudentId,
          });
        }
        studentId = dupStudentId;

        // Kiểm tra student chưa có enrollment ACTIVE trong lớp này (nếu có classId)
        if (validated.classId) {
          const inClassRes = await client.query(
            `SELECT 1 FROM enrollments WHERE student_id = $1 AND class_id = $2 AND status = 'ACTIVE' LIMIT 1`,
            [studentId, validated.classId],
          );
          if (inClassRes.rows.length > 0) {
            throw AppError.badRequest("Học viên này đã có trong lớp được chọn.", {
              code: "TRIAL/STUDENT_ALREADY_IN_CLASS",
            });
          }
        }

        // R5: Chặn parallel enrollment — student đã có ACTIVE/PAUSED ở lớp khác
        const activeElsewhereRes = await client.query(
          `SELECT 1 FROM enrollments WHERE student_id = $1 AND status IN ('ACTIVE', 'PAUSED') LIMIT 1`,
          [studentId],
        );
        if (activeElsewhereRes.rows.length > 0) {
          throw AppError.badRequest(
            "Học viên đã có lớp đang học. Vui lòng chuyển lớp hoặc kết thúc lớp hiện tại trước khi convert.",
            { code: "ENROLLMENT_ONE_ACTIVE_PER_STUDENT", studentId },
          );
        }
      } else if (dupStudentId) {
        // Reuse student cũ khi trùng phone/email/guardian_phone — không tạo duplicate
        studentId = dupStudentId;
        if (validated.classId) {
          const inClassRes = await client.query(
            `SELECT 1 FROM enrollments WHERE student_id = $1 AND class_id = $2 AND status = 'ACTIVE' LIMIT 1`,
            [studentId, validated.classId],
          );
          if (inClassRes.rows.length > 0) {
            throw AppError.badRequest("Học viên này đã có trong lớp được chọn.", {
              code: "TRIAL/STUDENT_ALREADY_IN_CLASS",
            });
          }
        }
        const activeElsewhereRes = await client.query(
          `SELECT 1 FROM enrollments WHERE student_id = $1 AND status IN ('ACTIVE', 'PAUSED') LIMIT 1`,
          [studentId],
        );
        if (activeElsewhereRes.rows.length > 0) {
          throw AppError.badRequest(
            "Học viên đã có lớp đang học. Vui lòng chuyển lớp hoặc kết thúc lớp hiện tại trước khi convert.",
            { code: "ENROLLMENT_ONE_ACTIVE_PER_STUDENT", studentId },
          );
        }
      } else {
        // Tạo Student mới
        const studentRes = await client.query(
          `INSERT INTO students (full_name, dob, gender, phone, email, guardian_name, guardian_phone, address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            fullName,
            validated.student.dob ?? null,
            validated.student.gender ?? null,
            phone,
            email,
            validated.student.guardianName ?? null,
            validated.student.guardianPhone ?? null,
            validated.student.address ?? null,
          ],
        );
        studentId = String(studentRes.rows[0].id);
      }

      // 5) Tạo Enrollment
      const enrollmentRes = await client.query(
        `INSERT INTO enrollments (student_id, class_id, status, start_date, end_date)
         VALUES ($1, $2, 'ACTIVE', $3, NULL)
         RETURNING id`,
        [studentId, validated.classId ?? null, new Date()],
      );
      const enrollmentId = String(enrollmentRes.rows[0].id);

      // 6) Ghi conversion + update lead CONVERTED (trigger DB yêu cầu có trial_conversions trước)
      const convRes = await client.query(
        `INSERT INTO trial_conversions (trial_id, student_id, enrollment_id, converted_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, trial_id, student_id, enrollment_id, converted_at`,
        [trialId, studentId, enrollmentId],
      );
      await client.query(
        `UPDATE trial_leads SET status = 'CONVERTED', note = COALESCE($2, note) WHERE id = $1`,
        [trialId, validated.note ?? null],
      );

      // 7) Lịch sử enrollment
      await client.query(
        `INSERT INTO enrollment_history (enrollment_id, from_status, to_status, note, changed_by, from_class_id, to_class_id)
         VALUES ($1, 'ACTIVE', 'ACTIVE', $2, $3, NULL, $4)`,
        [
          enrollmentId,
          `Convert từ trial_lead: ${trialId}`,
          actorUserId ?? null,
          validated.classId ?? null,
        ],
      );

      await client.query("COMMIT");

      const convRow = convRes.rows[0] as {
        id: string;
        trial_id: string;
        student_id: string;
        enrollment_id: string;
        converted_at: Date;
      };

      return {
        message: "Chuyển đổi học viên thành công",
        conversion: {
          id: convRow.id,
          trialId: convRow.trial_id,
          studentId: convRow.student_id,
          enrollmentId: convRow.enrollment_id,
          convertedAt: convRow.converted_at,
        },
        studentId,
        enrollmentId,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
