/**
 * Trả về object schemas cho component của OpenAPI
 * Module sau sẽ bổ sung các Zod/schema json tại đây
 */
export function buildSchemas() {
  return {
    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'admin@eim.edu.vn' },
        password: { type: 'string', format: 'password', example: '123456' }
      }
    },
    LoginResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/UserProfile' }
          }
        }
      }
    },
    RefreshRequest: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string' }
      }
    },
    RefreshResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        }
      }
    },
    LogoutRequest: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string' }
      }
    },
    LogoutResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Đăng xuất thành công' }
          }
        }
      }
    },
    UserProfile: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string' },
        fullName: { type: 'string' },
        status: { type: 'string' },
        roles: {
          type: 'array',
          items: { type: 'string' }
        },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
      ErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'UNAUTHORIZED' },
            message: { type: 'string', example: 'Có lỗi xảy ra' },
            details: { type: 'object', nullable: true }
          }
        }
      }
    },
    ProgramSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        code: { type: 'string' },
        name: { type: 'string' },
        level: { type: 'string' },
        totalUnits: { type: 'integer' },
        lessonsPerUnit: { type: 'integer' },
        sessionsPerWeek: { type: 'integer' },
        feePlanId: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    UnitSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        programId: { type: 'string', format: 'uuid' },
        unitNo: { type: 'integer' },
        title: { type: 'string' },
        totalLessons: { type: 'integer' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    LessonSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        unitId: { type: 'string', format: 'uuid' },
        lessonNo: { type: 'integer' },
        title: { type: 'string' },
        sessionPattern: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    UnitWithLessonsSchema: {
      allOf: [
        { $ref: '#/components/schemas/UnitSchema' },
        {
          type: 'object',
          properties: {
            lessons: {
              type: 'array',
              items: { $ref: '#/components/schemas/LessonSchema' }
            }
          }
        }
      ]
    },
    CreateProgramRequest: {
      type: 'object',
      required: ['code', 'name', 'level', 'totalUnits'],
      properties: {
        code: { type: 'string', example: 'PRG-TEST' },
        name: { type: 'string', example: 'Chương trình Test' },
        level: { type: 'string', example: 'KINDY' },
        totalUnits: { type: 'integer', example: 10 },
        lessonsPerUnit: { type: 'integer', example: 7 },
        sessionsPerWeek: { type: 'integer', example: 2 },
        feePlanId: { type: 'string', format: 'uuid' }
      }
    },
    UpdateProgramRequest: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' },
        level: { type: 'string' },
        totalUnits: { type: 'integer' },
        lessonsPerUnit: { type: 'integer' },
        sessionsPerWeek: { type: 'integer' },
        feePlanId: { type: 'string', format: 'uuid' }
      }
    },
    CreateUnitRequest: {
      type: 'object',
      required: ['unitNo', 'title'],
      properties: {
        unitNo: { type: 'integer', example: 1 },
        title: { type: 'string', example: 'Unit 1: Hello' }
      }
    },
    UpdateUnitRequest: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        totalLessons: { type: 'integer' }
      }
    },
    Student: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        fullName: { type: 'string' },
        dob: { type: 'string', format: 'date-time', nullable: true },
        gender: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        guardianName: { type: 'string', nullable: true },
        guardianPhone: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    Enrollment: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        studentId: { type: 'string', format: 'uuid' },
        classId: { type: 'string', format: 'uuid' },
        status: { type: 'string' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    EnrollmentHistory: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        enrollmentId: { type: 'string', format: 'uuid' },
        fromStatus: { type: 'string' },
        toStatus: { type: 'string' },
        note: { type: 'string', nullable: true },
        changedAt: { type: 'string', format: 'date-time' }
      }
    },
    CreateStudentRequest: {
      type: 'object',
      required: ['fullName'],
      properties: {
        fullName: { type: 'string', example: 'Nguyễn Văn A' },
        dob: { type: 'string', example: '2015-01-01' },
        gender: { type: 'string', example: 'Nam' },
        phone: { type: 'string', example: '0987654321' },
        email: { type: 'string', example: 'nva@eim.edu.vn' },
        guardianName: { type: 'string', example: 'Nguyễn Văn B' },
        guardianPhone: { type: 'string', example: '0912345678' },
        address: { type: 'string', example: 'Hà Nội' }
      }
    },
    UpdateStudentRequest: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        dob: { type: 'string' },
        gender: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        guardianName: { type: 'string' },
        guardianPhone: { type: 'string' },
        address: { type: 'string' }
      }
    },
    CreateEnrollmentRequest: {
      type: 'object',
      required: ['studentId', 'classId', 'startDate'],
      properties: {
        studentId: { type: 'string', format: 'uuid' },
        classId: { type: 'string', format: 'uuid' },
        startDate: { type: 'string', format: 'date' }
      }
    },
    UpdateEnrollmentStatusRequest: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'DROPPED', 'TRANSFERRED', 'GRADUATED'] },
        note: { type: 'string' }
      }
    },
    TransferEnrollmentRequest: {
      type: 'object',
      required: ['toClassId'],
      properties: {
        toClassId: { type: 'string', format: 'uuid' },
        note: { type: 'string' }
      }
    },
    PagedStudentsResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/Student' }
            },
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' }
          }
        }
      }
    },
    Class: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        code: { type: 'string' },
        name: { type: 'string' },
        programId: { type: 'string', format: 'uuid' },
        room: { type: 'string', nullable: true },
        capacity: { type: 'integer' },
        startDate: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'CLOSED'] },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    ClassSchedule: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        classId: { type: 'string', format: 'uuid' },
        weekday: { type: 'integer', description: '1 (Thứ 2) đến 7 (Chủ nhật)' },
        startTime: { type: 'string', description: 'Định dạng HH:mm hoặc HH:mm:ss' },
        endTime: { type: 'string', description: 'Định dạng HH:mm hoặc HH:mm:ss' }
      }
    },
    ClassStaff: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        classId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        // class_staff chỉ nhận MAIN/TA. Cover teacher nằm ở session.coverTeacherId.
        type: { type: 'string', enum: ['MAIN', 'TA'] },
        assignedAt: { type: 'string', format: 'date-time' }
      }
    },
    ClassDetail: {
      allOf: [
        { $ref: '#/components/schemas/Class' },
        {
          type: 'object',
          properties: {
            schedules: {
              type: 'array',
              items: { $ref: '#/components/schemas/ClassSchedule' }
            },
            staff: {
              type: 'array',
              items: { $ref: '#/components/schemas/ClassStaff' }
            }
          }
        }
      ]
    },
    CreateClassRequest: {
      type: 'object',
      required: ['code', 'name', 'programId', 'startDate'],
      properties: {
        code: { type: 'string', example: 'ST-101' },
        name: { type: 'string', example: 'Starters 101' },
        programId: { type: 'string', format: 'uuid' },
        room: { type: 'string', example: 'Room A' },
        capacity: { type: 'integer', example: 16 },
        startDate: { type: 'string', format: 'date', example: '2024-09-01' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'CLOSED'], example: 'ACTIVE' }
      }
    },
    UpdateClassRequest: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        room: { type: 'string' },
        capacity: { type: 'integer' },
        startDate: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'CLOSED'] }
      }
    },
    UpsertSchedulesRequest: {
      type: 'object',
      required: ['schedules'],
      properties: {
        schedules: {
          type: 'array',
          items: {
            type: 'object',
            required: ['weekday', 'startTime', 'endTime'],
            properties: {
              weekday: { type: 'integer', example: 2 },
              startTime: { type: 'string', example: '18:00:00' },
              endTime: { type: 'string', example: '19:30:00' }
            }
          }
        }
      }
    },
    AssignStaffRequest: {
      type: 'object',
      required: ['userId', 'type'],
      properties: {
        userId: { type: 'string', format: 'uuid' },
        // class_staff chỉ nhận MAIN/TA. Cover teacher nằm ở session.coverTeacherId.
        type: { type: 'string', enum: ['MAIN', 'TA'], example: 'MAIN' }
      }
    },
    RemoveStaffRequest: {
      type: 'object',
      required: ['userId', 'type'],
      properties: {
        userId: { type: 'string', format: 'uuid' },
        // class_staff chỉ nhận MAIN/TA. Cover teacher nằm ở session.coverTeacherId.
        type: { type: 'string', enum: ['MAIN', 'TA'], example: 'MAIN' }
      }
    },
    PromoteClassRequest: {
      type: 'object',
      properties: {
        toClassId: { type: 'string', format: 'uuid', nullable: true, description: 'Lớp đích; null = tạo enrollment chưa xếp lớp' },
        isRepeat: { type: 'boolean', default: false, description: 'true = học lại cùng level' },
        note: { type: 'string' },
        startDate: { type: 'string', format: 'date', description: 'YYYY-MM-DD' },
        closeSourceClass: { type: 'boolean', default: true, description: 'Đóng lớp nguồn sau khi promote' }
      }
    },
    RosterStudent: {
      type: 'object',
      properties: {
        studentId: { type: 'string', format: 'uuid' },
        fullName: { type: 'string', example: 'Nguyễn Văn A' },
        status: { type: 'string', example: 'ACTIVE' }
      }
    },
    PagedClassesResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/Class' }
            },
            total: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            offset: { type: 'integer', example: 0 }
          }
        }
      }
    },
    Session: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        classId: { type: 'string', format: 'uuid' },
        sessionDate: { type: 'string', format: 'date-time' },
        unitNo: { type: 'integer' },
        lessonNo: { type: 'integer', description: 'Nếu là 0, đây là một session đặc biệt (TEST, MIDTERM, FINAL)' },
        sessionType: { type: 'string', enum: ['NORMAL', 'TEST', 'MIDTERM', 'FINAL'] },
        mainTeacherId: { type: 'string', format: 'uuid', nullable: true },
        coverTeacherId: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        isSpecial: { type: 'boolean' }
      }
    },
    SessionsListResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Session' }
        }
      }
    },
    SessionResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/Session' }
      }
    },
    GenerateSessionsRequest: {
      type: 'object',
      properties: {
        fromDate: { type: 'string', format: 'date-time', example: '2024-09-01T00:00:00Z', description: 'Deprecated: backend dùng class.startDate' },
        weeks: { type: 'integer', example: 10, description: 'Tuỳ chọn: Số tuần dự kiến của lịch học' },
        untilUnitNo: { type: 'integer', example: 5, description: 'Tuỳ chọn: Dừng sinh lịch sau khi hoàn tất Unit xác định' },
        replaceExisting: { type: 'boolean', description: 'true: xóa toàn bộ buổi hiện có rồi sinh lại (mất feedback gắn buổi)' }
      }
    },
    UpdateSessionRequest: {
      type: 'object',
      properties: {
        sessionDate: { type: 'string', format: 'date-time', example: '2024-09-02T18:00:00Z' },
        note: { type: 'string', example: 'Giáo viên ốm' },
        coverTeacherId: { type: 'string', format: 'uuid', nullable: true },
        unitNo: { type: 'integer', example: 3 },
        lessonNo: { type: 'integer', example: 1, description: '0 = buổi khảo thí milestone' }
      }
    },
    
    // ==========================================
    // MODULE 7: TRIALS SCHEMAS
    // ==========================================
    TrialLead: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        fullName: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string', nullable: true },
        source: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CONVERTED', 'CLOSED'] },
        note: { type: 'string', nullable: true },
        createdBy: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    TrialSchedule: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        trialId: { type: 'string', format: 'uuid' },
        classId: { type: 'string', format: 'uuid' },
        trialDate: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    TrialDetails: {
      allOf: [
        { $ref: '#/components/schemas/TrialLead' },
        {
          type: 'object',
          properties: {
            schedule: {
              nullable: true,
              $ref: '#/components/schemas/TrialSchedule'
            }
          }
        }
      ]
    },
    CreateTrialRequest: {
      type: 'object',
      required: ['fullName', 'phone'],
      properties: {
        fullName: { type: 'string', example: 'Nguyễn Văn Trial' },
        phone: { type: 'string', example: '0912345678' },
        email: { type: 'string', example: 'trial@example.com' },
        source: { type: 'string', example: 'Facebook Ads' },
        note: { type: 'string', example: 'Phụ huynh quan tâm khóa tiếng Anh trẻ em' }
      }
    },
    UpdateTrialRequest: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        source: { type: 'string' },
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CONVERTED', 'CLOSED'] },
        note: { type: 'string' }
      }
    },
    ScheduleTrialRequest: {
      type: 'object',
      required: ['classId', 'trialDate'],
      properties: {
        classId: { type: 'string', format: 'uuid' },
        trialDate: { type: 'string', format: 'date-time', example: '2024-09-02T18:00:00Z' }
      }
    },
    ConvertTrialRequest: {
      type: 'object',
      required: ['student', 'classId'],
      properties: {
        student: {
          type: 'object',
          required: ['fullName'],
          properties: {
            fullName: { type: 'string', example: 'Nguyễn Văn Trial' },
            phone: { type: 'string', example: '0912345678' },
            email: { type: 'string', example: 'trial@example.com' },
            guardianName: { type: 'string', example: 'Nguyễn Phụ Huynh' },
            guardianPhone: { type: 'string', example: '0987654321' },
            address: { type: 'string', example: 'Hà Nội' },
            dob: { type: 'string', format: 'date-time', example: '2015-01-01T00:00:00Z' },
            gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'], example: 'MALE' }
          }
        },
        classId: { type: 'string', format: 'uuid' },
        note: { type: 'string', example: 'Chuyển từ học thử ngày 02/09' }
      }
    },
    PagedTrialsResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/TrialDetails' }
            },
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' }
          }
        }
      }
    },
    TrialStatusResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/TrialDetails' }
      }
    },
    ConvertTrialResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            conversion: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                trialId: { type: 'string', format: 'uuid' },
                studentId: { type: 'string', format: 'uuid' },
                enrollmentId: { type: 'string', format: 'uuid' },
                convertedAt: { type: 'string', format: 'date-time' }
              }
            },
            studentId: { type: 'string', format: 'uuid' },
            enrollmentId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },

    // ==========================================
    // MODULE 6: FEEDBACK & SCORES SCHEMAS
    // ==========================================
    FeedbackItem: {
      type: 'object',
      properties: {
        studentId: { type: 'string', format: 'uuid' },
        attendance: { type: 'string', enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], nullable: true },
        homework: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'NEEDS_WORK', 'NOT_DONE'], nullable: true },
        participation: { type: 'string', enum: ['VERY_ACTIVE', 'ACTIVE', 'PASSIVE', 'DISTRACTED'], nullable: true },
        behavior: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'DISRUPTIVE'], nullable: true },
        comment: { type: 'string', nullable: true }
      }
    },
    UpsertFeedbackRequest: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/FeedbackItem' },
          minItems: 1
        }
      }
    },
    SessionFeedbackResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              studentId: { type: 'string', format: 'uuid' },
              studentName: { type: 'string' },
              feedback: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  attendance: { type: 'string' },
                  homework: { type: 'string' },
                  participation: { type: 'string' },
                  behavior: { type: 'string' },
                  comment: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    ScoreItem: {
      type: 'object',
      properties: {
        studentId: { type: 'string', format: 'uuid' },
        scoreType: { type: 'string', enum: ['TEST', 'MIDTERM', 'FINAL'] },
        listening: { type: 'number', nullable: true },
        reading: { type: 'number', nullable: true },
        writing: { type: 'number', nullable: true },
        speaking: { type: 'number', nullable: true },
        total: { type: 'number', nullable: true }
      }
    },
    UpsertScoresRequest: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/ScoreItem' },
          minItems: 1
        }
      }
    },
    SessionScoresResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              studentId: { type: 'string', format: 'uuid' },
              score: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  scoreType: { type: 'string' },
                  listening: { type: 'number' },
                  reading: { type: 'number' },
                  writing: { type: 'number' },
                  speaking: { type: 'number' },
                  total: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    StudentFeedbackHistoryResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            allOf: [
              { $ref: '#/components/schemas/FeedbackItem' },
              {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  sessionId: { type: 'string', format: 'uuid' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            ]
          }
        }
      }
    },
    StudentScoresHistoryResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            allOf: [
              { $ref: '#/components/schemas/ScoreItem' },
              {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  sessionId: { type: 'string', format: 'uuid' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            ]
          }
        }
      }
    },

    // ==========================================
    // MODULE 8: FINANCE SCHEMAS
    // ==========================================

    /** Gói học phí */
    FeePlan: {
      type: 'object',
      properties: {
        id:              { type: 'string', format: 'uuid' },
        programId:       { type: 'string', format: 'uuid' },
        name:            { type: 'string', example: 'STARTERS Standard' },
        amount:          { type: 'integer', example: 3500000 },
        currency:        { type: 'string', example: 'VND' },
        sessionsPerWeek: { type: 'integer', example: 2 },
        createdAt:       { type: 'string', format: 'date-time' }
      }
    },
    CreateFeePlanRequest: {
      type: 'object',
      required: ['programId', 'name', 'amount'],
      properties: {
        programId:       { type: 'string', format: 'uuid', example: '00000000-0000-0000-0000-000000000001' },
        name:            { type: 'string', example: 'STARTERS Standard' },
        amount:          { type: 'integer', example: 3500000 },
        currency:        { type: 'string', example: 'VND' },
        sessionsPerWeek: { type: 'integer', example: 2 }
      }
    },
    UpdateFeePlanRequest: {
      type: 'object',
      properties: {
        name:            { type: 'string', example: 'STARTERS Premium' },
        amount:          { type: 'integer', example: 4000000 },
        currency:        { type: 'string', example: 'VND' },
        sessionsPerWeek: { type: 'integer', example: 3 }
      }
    },

    /** Hóa đơn học phí */
    Invoice: {
      type: 'object',
      properties: {
        id:           { type: 'string', format: 'uuid' },
        enrollmentId: { type: 'string', format: 'uuid' },
        amount:       { type: 'integer', example: 3500000 },
        status: {
          type: 'string',
          enum: ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELED'],
          example: 'DRAFT',
          description: 'Luồng: DRAFT→ISSUED→PAID/OVERDUE/CANCELED | OVERDUE→PAID/CANCELED'
        },
        dueDate:   { type: 'string', format: 'date', example: '2026-04-01' },
        issuedAt:  { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    CreateInvoiceRequest: {
      type: 'object',
      required: ['enrollmentId', 'amount', 'dueDate'],
      properties: {
        enrollmentId: { type: 'string', format: 'uuid', example: '00000000-0000-0000-0000-000000000002' },
        amount:       { type: 'integer', example: 3500000 },
        dueDate:      { type: 'string', format: 'date', example: '2026-04-01', description: 'Định dạng YYYY-MM-DD' }
      }
    },
    UpdateInvoiceStatusRequest: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELED'],
          example: 'ISSUED',
          description: 'Luồng hợp lệ: DRAFT→ISSUED/CANCELED | ISSUED→PAID/OVERDUE/CANCELED | OVERDUE→PAID/CANCELED'
        }
      }
    },

    /** Thanh toán */
    Payment: {
      type: 'object',
      properties: {
        id:        { type: 'string', format: 'uuid' },
        invoiceId: { type: 'string', format: 'uuid' },
        amount:    { type: 'integer', example: 3500000 },
        method:    { type: 'string', enum: ['CASH', 'TRANSFER', 'CARD', 'OTHER'], example: 'TRANSFER' },
        paidAt:    { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    CreatePaymentRequest: {
      type: 'object',
      required: ['invoiceId', 'amount', 'method', 'paidAt'],
      properties: {
        invoiceId: { type: 'string', format: 'uuid', example: '00000000-0000-0000-0000-000000000003' },
        amount:    { type: 'integer', example: 3500000 },
        method:    { type: 'string', enum: ['CASH', 'TRANSFER', 'CARD', 'OTHER'], example: 'TRANSFER' },
        paidAt:    { type: 'string', format: 'date-time', example: '2026-03-07T10:00:00Z' }
      }
    },

    /** Chi tiết hóa đơn kèm thanh toán */
    InvoiceDetailsResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          allOf: [
            { $ref: '#/components/schemas/Invoice' },
            {
              type: 'object',
              properties: {
                paidAmount:       { type: 'integer', example: 3500000, description: 'Tổng số tiền đã thanh toán' },
                remainingAmount:  { type: 'integer', example: 0, description: 'Số tiền còn lại cần thanh toán' },
                isPaidFull:       { type: 'boolean', example: true, description: 'Đã thanh toán đầy đủ chưa' },
                payments: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Payment' }
                }
              }
            }
          ]
        }
      }
    },

    /** Danh sách hóa đơn có phân trang */
    PagedInvoicesResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items:  { type: 'array', items: { $ref: '#/components/schemas/Invoice' } },
            total:  { type: 'integer', example: 20 },
            limit:  { type: 'integer', example: 10 },
            offset: { type: 'integer', example: 0 }
          }
        }
      }
    },

    /** Tóm tắt tài chính học viên */
    StudentFinanceResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            studentId:   { type: 'string', format: 'uuid' },
            enrollments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  enrollment: { $ref: '#/components/schemas/Enrollment' },
                  renewalNeeded: { type: 'boolean', description: 'Có cần xử lý gia hạn/đóng tiền không (derived)' },
                  invoices: {
                    type: 'array',
                    items: {
                      allOf: [
                        { $ref: '#/components/schemas/Invoice' },
                        {
                          type: 'object',
                          properties: {
                            paidAmount:      { type: 'integer' },
                            remainingAmount: { type: 'integer' },
                            isPaidFull:      { type: 'boolean' }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },
            invoiceSummary: {
              type: 'object',
              properties: {
                total:          { type: 'integer', description: 'Tổng số hóa đơn' },
                totalAmount:    { type: 'integer', description: 'Tổng tiền học phí' },
                totalPaidAmount:      { type: 'integer', description: 'Tổng tiền đã đóng' },
                totalRemainingAmount: { type: 'integer', description: 'Tổng còn nợ' }
              }
            }
          }
        }
      }
    },

    // ==========================================
    // MODULE 9: SYSTEM SCHEMAS
    // ==========================================

    /** Bản ghi kiểm toán hành động hệ thống */
    AuditLog: {
      type: 'object',
      properties: {
        id:          { type: 'string', format: 'uuid' },
        actorUserId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
          description: 'UUID người thực hiện. Null nếu là hành động hệ thống/anonymous'
        },
        action:   {
          type: 'string',
          example: 'AUTH_LOGIN',
          description: 'Tên hành động. Ví dụ: AUTH_LOGIN, STUDENT_CREATE, INVOICE_CREATE'
        },
        entity:   {
          type: 'string',
          example: 'auth_user',
          description: 'Tên đối tượng/bảng bị tác động. Ví dụ: auth_user, student, invoice'
        },
        entityId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
          description: 'UUID bản ghi bị tác động. Null nếu không áp dụng'
        },
        meta: {
          type: 'object',
          additionalProperties: true,
          description: 'Thông tin bổ sung dạng JSON object linh hoạt (IP, user-agent, payload diff, v.v.)',
          example: { ip: '127.0.0.1', result: 'SUCCESS', user_agent: 'Mozilla/5.0' }
        },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },

    /** Danh sách audit log có phân trang */
    PagedAuditLogsResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items:  { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
            total:  { type: 'integer', example: 50 },
            limit:  { type: 'integer', example: 20 },
            offset: { type: 'integer', example: 0 }
          }
        }
      }
    },

    /** Thông báo hệ thống gửi đến user */
    Notification: {
      type: 'object',
      properties: {
        id:        { type: 'string', format: 'uuid' },
        userId:    { type: 'string', format: 'uuid', description: 'ID người nhận thông báo' },
        title:     { type: 'string', example: 'Học phí tháng 3 sắp đến hạn' },
        body:      { type: 'string', example: 'Học phí tháng 3/2026 sẽ đến hạn vào ngày 15/03/2026.' },
        isRead:    { type: 'boolean', example: false, description: 'false = chưa đọc, true = đã đọc' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },

    /** Danh sách thông báo có phân trang */
    PagedNotificationsResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items:  { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
            total:  { type: 'integer', example: 3 },
            limit:  { type: 'integer', example: 20 },
            offset: { type: 'integer', example: 0 }
          }
        }
      }
    },

    SystemUser: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        fullName: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        roles: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    PagedUsersResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/SystemUser' } },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' }
          }
        }
      }
    },
    CreateUserRequest: {
      type: 'object',
      required: ['email', 'password', 'fullName', 'roleCode'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        fullName: { type: 'string' },
        roleCode: { type: 'string' }
      }
    },
    UpdateUserRequest: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] }
      }
    },
    AssignRoleRequest: {
      type: 'object',
      required: ['roleCode'],
      properties: {
        roleCode: { type: 'string' }
      }
    }
  };
}
