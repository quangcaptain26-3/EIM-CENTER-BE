#!/usr/bin/env node
/**
 * E2E Test Flow - Hệ thống EIM
 * Chạy: node test-e2e-flow.mjs
 * Yêu cầu: Backend chạy tại http://localhost:3000, DB đã seed
 */

const BASE = process.env.API_BASE || 'http://localhost:3000';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo@123456'; // DB seed: Demo@123456 (Eim@2024 sau khi re-seed)

const log = (step, msg, data) => {
  console.log(`\n--- ${step} ---`);
  console.log(msg);
  if (data) console.log(JSON.stringify(data, null, 2));
};

async function req(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, data: json };
}

async function login(email) {
  const { status, data } = await req('POST', '/auth/login', { email, password: PASSWORD });
  if (status !== 200) throw new Error(`Login ${email} failed: ${status} ${JSON.stringify(data)}`);
  return data.data.accessToken;
}

const report = { pass: [], fail: [], warn: [] };

async function main() {
  console.log('=== E2E TEST EIM FLOW ===');
  console.log('Base URL:', BASE);

  let token_sales, token_hocvu, token_teacher, token_ketoan;
  let trial_id, student_id, enrollment_id, class_id, session_id, invoice_id;

  try {
    // ========== BƯỚC 1 — Đăng nhập ==========
    log('BƯỚC 1', 'Đăng nhập các role...');
    token_sales = await login('sales@eim.edu.vn');
    token_hocvu = await login('academic@eim.edu.vn');
    token_teacher = await login('teacher@eim.edu.vn');
    token_ketoan = await login('accountant@eim.edu.vn');
    report.pass.push('B1: Đăng nhập 4 role OK');

    // ========== BƯỚC 2 — Sales tạo trial ==========
    log('BƯỚC 2', 'Sales tạo trial...');
    const suffix = Date.now().toString(36).slice(-6);
    const createTrial = await req('POST', '/trials', {
      fullName: `Test E2E Học Viên ${suffix}`,
      phone: `0987${suffix}321`,
      email: `test.e2e.${suffix}@example.com`,
      source: 'referral',
      note: 'E2E test',
    }, token_sales);

    if (createTrial.status !== 201) {
      report.fail.push(`B2: POST /trials failed ${createTrial.status} - ${JSON.stringify(createTrial.data)}`);
    } else {
      trial_id = createTrial.data.data.id;
      log('B2', 'Trial created', { trial_id });

      // Schedule - cần classId. Dùng lớp seed EIM1-STARTERS-2025A
      const seedClassId = 'e8c18712-51c2-47ba-b3d2-be18724f4241';
      const schedulePath = `/trials/${trial_id}/schedule`;
      const schedule2 = await req('POST', schedulePath, {
        classId: seedClassId,
        trialDate: new Date(Date.now() + 86400000).toISOString(),
      }, token_sales);

      if (schedule2.status !== 200) {
        report.fail.push(`B2: POST /trials/:id/schedule failed ${schedule2.status} - ${JSON.stringify(schedule2.data)}`);
      }

      // PATCH trial - cập nhật status ATTENDED, note
      const patchTrial = await req('PATCH', `/trials/${trial_id}`, {
        status: 'ATTENDED',
        note: 'Đã học thử, sẵn sàng convert',
      }, token_sales);

      if (patchTrial.status !== 200) {
        report.fail.push(`B2: PATCH /trials/:id failed ${patchTrial.status} - ${JSON.stringify(patchTrial.data)}`);
      } else {
        report.pass.push('B2: Sales tạo trial, schedule, PATCH OK');
      }
    }

    // ========== BƯỚC 3 — Sales convert trial ==========
    log('BƯỚC 3', 'Sales convert trial...');
    const seedClassId = 'e8c18712-51c2-47ba-b3d2-be18724f4241';
    const convert = await req('POST', `/trials/${trial_id}/convert`, {
      student: { fullName: `Test E2E Học Viên ${suffix}`, phone: `0987${suffix}321`, email: `test.e2e.${suffix}@example.com` },
      classId: seedClassId,
      note: 'Convert E2E',
    }, token_sales);

    if (convert.status !== 200) {
      report.fail.push(`B3: POST /trials/:id/convert failed ${convert.status} - ${JSON.stringify(convert.data)}`);
    } else {
      student_id = convert.data.data.studentId;
      enrollment_id = convert.data.data.enrollmentId;
      log('B3', 'Convert OK', { student_id, enrollment_id });
      if (enrollment_id && student_id) {
        report.pass.push('B3: Convert trial OK, student_id + enrollment_id có');
      } else {
        report.warn.push('B3: Convert OK nhưng thiếu student_id hoặc enrollment_id trong response');
      }
    }

    // ========== BƯỚC 4 — Học vụ tạo lớp ==========
    log('BƯỚC 4', 'Học vụ tạo lớp...');
    const programId = 'd0af2da6-2e86-41e4-9400-34160e9ac6ae'; // STARTERS
    const createClass = await req('POST', '/classes', {
      code: `EIM-E2E-${suffix}`,
      name: `Lớp E2E Test ${suffix}`,
      programId,
      room: 'Room E2E',
      capacity: 12,
      startDate: '2025-10-01',
      schedules: [{ weekday: 1, startTime: '18:00', endTime: '19:30' }, { weekday: 3, startTime: '18:00', endTime: '19:30' }],
      autoGenerateSessions: false,
    }, token_hocvu);

    if (createClass.status !== 201) {
      report.fail.push(`B4: POST /classes failed ${createClass.status} - ${JSON.stringify(createClass.data)}`);
    } else {
      class_id = createClass.data.data.id;
      const genCount = createClass.data.data.generatedSessionsCount;
      log('B4', 'Class created', { class_id, generatedSessionsCount: genCount });

      const sess = await req('GET', `/classes/${class_id}/sessions`, null, token_hocvu);
      if (sess.status !== 200) {
        report.fail.push(`B4: GET /classes/:id/sessions failed ${sess.status}`);
      } else {
        const sessions = sess.data.data || [];
      if (sessions.length > 0) {
        report.pass.push(`B4: Tạo lớp OK, có ${sessions.length} sessions`);
      } else {
        report.pass.push('B4: Tạo lớp OK (autoGenerateSessions=false, 0 sessions)');
      }
      }
    }

    // ========== BƯỚC 5 — Học vụ xếp học sinh + gán GV ==========
    log('BƯỚC 5', 'Học vụ xếp học sinh + gán GV...');
    if (class_id && enrollment_id) {
      // Convert đã xếp vào seed class. Để test add enrollment: thử add vào class mới (cần enrollment chưa có class hoặc transfer)
      // Enrollment từ convert đã có class_id = seedClassId. Để add vào class mới cần enrollment chưa có class.
      // Dùng class vừa tạo - nhưng enrollment đã ở seed class. Add enrollment = transfer từ class cũ sang class mới.
      const addEnr = await req('POST', `/classes/${class_id}/enrollments`, { enrollmentId: enrollment_id }, token_hocvu);
      if (addEnr.status !== 201) {
        report.fail.push(`B5: POST /classes/:id/enrollments failed ${addEnr.status} - ${JSON.stringify(addEnr.data)}`);
      } else {
        report.pass.push('B5: Add enrollment OK');
      }
    }

    const teacherUserId = '6e374495-8f2c-416f-96e2-b6fd525f408c';
    const staffPath = class_id ? `/classes/${class_id}/staff` : '/classes/e8c18712-51c2-47ba-b3d2-be18724f4241/staff';
    const addStaff2 = await req('POST', staffPath, { userId: teacherUserId, type: 'MAIN' }, token_hocvu);
    if (addStaff2.status !== 200 && addStaff2.status !== 201) {
      report.fail.push(`B5: POST /classes/:id/staff failed ${addStaff2.status} - ${JSON.stringify(addStaff2.data)}`);
    } else {
      report.pass.push('B5: Gán staff OK');
    }

    const classDetail = await req('GET', `/classes/${class_id || 'e8c18712-51c2-47ba-b3d2-be18724f4241'}/roster`, null, token_hocvu);
    if (classDetail.status === 200 && classDetail.data.data?.length > 0) {
      report.pass.push('B5: Roster có học sinh');
    }

    // ========== BƯỚC 6 — Teacher nhập feedback ==========
    log('BƯỚC 6', 'Teacher nhập feedback...');
    let teacherSessions = await req('GET', `/sessions/teacher/${teacherUserId}`, null, token_teacher);
    if (teacherSessions.status !== 200) {
      const classSess = await req('GET', `/classes/${seedClassId}/sessions`, null, token_teacher);
      if (classSess.status === 200 && classSess.data.data?.length > 0) {
        session_id = classSess.data.data[0]?.id;
      }
    } else {
      const sessions = teacherSessions.data.data || [];
      session_id = sessions[0]?.id;
      if (session_id && student_id) {
        const feedback = await req('POST', `/sessions/${session_id}/feedback/upsert`, {
          items: [{ studentId: student_id, attendance: 'PRESENT', homework: 'DONE', participation: '5', behavior: '5', comment: 'E2E test' }],
        }, token_teacher);
        if (feedback.status !== 200) {
          const feedbackHocvu = await req('POST', `/sessions/${session_id}/feedback/upsert`, {
            items: [{ studentId: student_id, attendance: 'PRESENT', homework: 'DONE', participation: '5', behavior: '5', comment: 'E2E test (Học vụ override deadline)' }],
          }, token_hocvu);
          if (feedbackHocvu.status === 200) {
            report.pass.push('B6: Học vụ nhập feedback (override deadline) OK');
          } else {
            report.fail.push(`B6: POST feedback failed ${feedback.status} - ${JSON.stringify(feedback.data)}`);
          }
        } else {
          report.pass.push('B6: Teacher nhập feedback OK');
        }

        const feedbackAccountant = await req('POST', `/sessions/${session_id}/feedback/upsert`, {
          items: [{ studentId: student_id, attendance: 'PRESENT', homework: 'DONE', participation: '5', behavior: '5' }],
        }, token_ketoan);
        if (feedbackAccountant.status === 403) {
          report.pass.push('B6: Kế toán submit feedback → 403 OK');
        } else {
          report.warn.push(`B6: Kế toán submit feedback mong đợi 403, nhận ${feedbackAccountant.status}`);
        }
      } else {
        report.warn.push('B6: Không có session/student để test feedback');
      }
    }

    // ========== BƯỚC 7 — Kế toán invoice + payment ==========
    log('BƯỚC 7', 'Kế toán tạo invoice + payment...');
    if (enrollment_id) {
      const createInv = await req('POST', '/finance/invoices', {
        enrollmentId: enrollment_id,
        amount: 4000000,
        dueDate: '2026-12-31',
      }, token_ketoan);
      if (createInv.status !== 201) {
        report.fail.push(`B7: POST /finance/invoices failed ${createInv.status} - ${JSON.stringify(createInv.data)}`);
      } else {
        invoice_id = createInv.data.data.id;
        const paidAt = new Date().toISOString();
        const pay1 = await req('POST', '/finance/payments', {
          invoiceId: invoice_id,
          amount: 2000000,
          method: 'CASH',
          paidAt,
        }, token_ketoan);
        if (pay1.status !== 201) {
          report.fail.push(`B7: POST payment partial failed ${pay1.status}`);
        } else {
          const invGet = await req('GET', `/finance/invoices/${invoice_id}`, null, token_ketoan);
          const status1 = invGet.data?.data?.status;
          if (status1 === 'ISSUED' || status1 === 'partial') {
            report.pass.push('B7: Partial payment OK, invoice status hợp lý');
          }

          const pay2 = await req('POST', '/finance/payments', {
            invoiceId: invoice_id,
            amount: 2000000,
            method: 'TRANSFER',
            paidAt: new Date(Date.now() + 1000).toISOString(),
          }, token_ketoan);
          if (pay2.status !== 201) {
            report.fail.push(`B7: POST payment full failed ${pay2.status} - ${JSON.stringify(pay2.data)}`);
          } else {
            const invGet2 = await req('GET', `/finance/invoices/${invoice_id}`, null, token_ketoan);
            if (invGet2.data?.data?.status === 'PAID') {
              report.pass.push('B7: Full payment OK, status=PAID');
            }

            const pay3 = await req('POST', '/finance/payments', {
              invoiceId: invoice_id,
              amount: 100000,
              method: 'CASH',
              paidAt: new Date(Date.now() + 2000).toISOString(),
            }, token_ketoan);
            const errDetails = pay3.data?.error?.details || pay3.data?.details;
            const hasPaidError = pay3.status === 400 && (
              pay3.data?.error?.code === 'INVOICE_ALREADY_PAID' ||
              errDetails?.code === 'FINANCE/INVOICE_ALREADY_PAID' ||
              String(pay3.data).includes('PAID')
            );
            if (hasPaidError) {
              report.pass.push('B7: Payment thêm khi đã paid → lỗi INVOICE_ALREADY_PAID đúng');
            } else {
              report.warn.push(`B7: Mong đợi INVOICE_ALREADY_PAID khi payment thêm, nhận ${pay3.status} - ${JSON.stringify(pay3.data)}`);
            }
          }
        }
      }
    }

    // ========== BƯỚC 8 — Đóng lớp + Promote ==========
    log('BƯỚC 8', 'Đóng lớp + Promote...');
    const closeClassId = class_id || 'e8c18712-51c2-47ba-b3d2-be18724f4241';
    const close = await req('POST', `/classes/${closeClassId}/close`, { completeRemainingEnrollments: true }, token_hocvu);
    if (close.status !== 200) {
      report.fail.push(`B8: POST /classes/:id/close failed ${close.status} - ${JSON.stringify(close.data)}`);
    } else {
      report.pass.push('B8: Đóng lớp OK');
    }

    const moversClassId = '3a98f331-e7d6-4bda-9d70-ac98edc8f432'; // EIM1-MOVERS-2025A
    const promote = await req('POST', `/classes/${closeClassId}/promotion`, {
      toClassId: moversClassId,
      closeSourceClass: true,
    }, token_hocvu);
    if (promote.status !== 200) {
      report.fail.push(`B8: POST /classes/:id/promotion failed ${promote.status} - ${JSON.stringify(promote.data)}`);
    } else {
      const promData = promote.data.data;
      if (promData?.promotedCount >= 0) {
        report.pass.push(`B8: Promote OK, promotedCount=${promData.promotedCount}`);
      }
    }

  } catch (err) {
    report.fail.push(`EXCEPTION: ${err.message}`);
  }

  // ========== BÁO CÁO ==========
  console.log('\n\n========== BÁO CÁO E2E ==========');
  console.log('✅ PASS:', report.pass.length);
  report.pass.forEach((p) => console.log('  ', p));
  console.log('❌ FAIL:', report.fail.length);
  report.fail.forEach((f) => console.log('  ', f));
  console.log('⚠️ WARN:', report.warn.length);
  report.warn.forEach((w) => console.log('  ', w));
}

main().catch(console.error);
