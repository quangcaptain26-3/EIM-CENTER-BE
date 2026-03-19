import { AppError } from "../../../shared/errors/app-error";
import { TrialRepoPort } from "../../../domain/trials/repositories/trial.repo.port";
import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { ConvertTrialBody, ConvertTrialSchema } from "../dtos/convert.dto";
import { ConvertTrialRule } from "../../../domain/trials/services/convert-trial.rule";
import { pool } from "../../../infrastructure/db/pg-pool";

export class ConvertTrialUseCase {
  constructor(
    private readonly trialRepo: TrialRepoPort,
    private readonly studentRepo: StudentRepoPort,
    private readonly enrollmentRepo: EnrollmentRepoPort
  ) {}

  async execute(trialId: string, data: ConvertTrialBody, actorUserId?: string) {
    const validated = ConvertTrialSchema.parse(data);

    // Convert phải atomic: gom toàn bộ các bước vào một transaction.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1) Lock TrialLead để chống convert trùng (race) và đảm bảo transition hợp lệ.
      const leadRes = await client.query(
        `SELECT * FROM trial_leads WHERE id = $1 FOR UPDATE`,
        [trialId],
      );
      if (leadRes.rows.length === 0) {
        throw AppError.notFound("Không tìm thấy TrialLead");
      }
      const leadRow = leadRes.rows[0] as {
        id: string;
        full_name?: string;
        phone: string;
        email: string | null;
        status: string;
        note: string | null;
      };

      // 2) Kiểm tra rule cho phép convert (không phải CONVERTED / CLOSED)
      // Dùng rule domain để nhất quán nghiệp vụ.
      const leadEntity = await this.trialRepo.findById(trialId);
      if (!leadEntity) {
        throw AppError.notFound("Không tìm thấy TrialLead");
      }
      if (!ConvertTrialRule.isConvertible(leadEntity)) {
        throw AppError.badRequest("TrialLead không đủ điều kiện để chuyển đổi (đã chuyển đổi hoặc đã đóng).", {
          code: "TRIAL/NOT_CONVERTIBLE",
          status: leadEntity.status,
        });
      }

      // 3) Validate class constraint nếu convert kèm classId
      // - class phải ACTIVE
      // - check capacity trong transaction (và DB trigger vẫn là lớp chốt chống race)
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

      // 4) Chống duplicate student theo phone/email
      const phone = (validated.student.phone || leadRow.phone || "").trim();
      const emailRaw = (validated.student.email || leadRow.email || null);
      const email = emailRaw ? String(emailRaw).trim().toLowerCase() : null;
      const fullName = (validated.student.fullName || leadEntity.fullName || "").trim();

      if (!phone) {
        throw AppError.badRequest("Thiếu số điện thoại học viên khi convert", { code: "TRIAL/STUDENT_PHONE_REQUIRED" });
      }
      if (!fullName) {
        throw AppError.badRequest("Thiếu họ tên học viên khi convert", { code: "TRIAL/STUDENT_FULLNAME_REQUIRED" });
      }

      const dupRes = await client.query(
        `
          SELECT id
          FROM students
          WHERE ($1::TEXT IS NOT NULL AND phone = $1)
             OR ($2::TEXT IS NOT NULL AND LOWER(email) = $2)
          LIMIT 1
        `,
        [phone, email],
      );
      if (dupRes.rows.length > 0) {
        throw AppError.conflict("Học viên đã tồn tại (trùng phone/email). Không thể convert tạo mới.", {
          code: "TRIAL/DUPLICATE_STUDENT",
        });
      }

      // 5) Tạo Student (trong transaction)
      const studentRes = await client.query(
        `
          INSERT INTO students (full_name, dob, gender, phone, email, guardian_name, guardian_phone, address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `,
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
      const studentId = String(studentRes.rows[0].id);

      // 6) Tạo Enrollment (cho phép classId = null theo blueprint)
      const enrollmentRes = await client.query(
        `
          INSERT INTO enrollments (student_id, class_id, status, start_date, end_date)
          VALUES ($1, $2, 'ACTIVE', $3, NULL)
          RETURNING id
        `,
        [studentId, validated.classId ?? null, new Date()],
      );
      const enrollmentId = String(enrollmentRes.rows[0].id);

      // 7) Ghi conversion + update lead status CONVERTED (atomic)
      const convRes = await client.query(
        `
          INSERT INTO trial_conversions (trial_id, student_id, enrollment_id, converted_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING id, trial_id, student_id, enrollment_id, converted_at
        `,
        [trialId, studentId, enrollmentId],
      );

      // Gắn note convert nếu có (không bắt buộc)
      await client.query(
        `UPDATE trial_leads SET status = 'CONVERTED', note = COALESCE($2, note) WHERE id = $1`,
        [trialId, validated.note ?? null],
      );

      // (Tuỳ chọn) Lưu enrollment_history để có actor truy vết nội bộ.
      // Không log thừa dữ liệu cá nhân; chỉ lưu changed_by.
      await client.query(
        `
          INSERT INTO enrollment_history (enrollment_id, from_status, to_status, note, changed_by, from_class_id, to_class_id)
          VALUES ($1, 'ACTIVE', 'ACTIVE', $2, $3, NULL, $4)
        `,
        [
          enrollmentId,
          `Convert từ trial_lead: ${trialId}`,
          actorUserId ?? null,
          validated.classId ?? null,
        ],
      );

      await client.query("COMMIT");

      const conversionRow = convRes.rows[0] as {
        id: string;
        trial_id: string;
        student_id: string;
        enrollment_id: string;
        converted_at: Date;
      };

      return {
        message: "Chuyển đổi học viên thành công",
        conversion: {
          id: conversionRow.id,
          trialId: conversionRow.trial_id,
          studentId: conversionRow.student_id,
          enrollmentId: conversionRow.enrollment_id,
          convertedAt: conversionRow.converted_at,
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
