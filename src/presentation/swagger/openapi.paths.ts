/**
 * Trả về object paths cho OpenAPI format
 * Bao gồm khai báo các endpoint API của hệ thống
 */
export function buildPaths() {
  return {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Kiểm tra trạng thái hoạt động của API',
        responses: {
          '200': {
            description: 'API hoạt động bình thường',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { 
                      type: 'object', 
                      properties: { 
                        status: { type: 'string', example: 'ok' } 
                      } 
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng nhập vào hệ thống',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } }
          }
        },
        responses: {
          '200': {
            description: 'Đăng nhập thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } }
          },
          '401': {
            description: 'Đăng nhập thất bại (sai email hoặc mật khẩu)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Cấp lại token mới dựa trên refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } }
          }
        },
        responses: {
          '200': {
            description: 'Refresh token thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshResponse' } } }
          },
          '401': {
            description: 'Refresh token thất bại (hết hạn hoặc đã thu hồi)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng xuất khỏi hệ thống',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LogoutRequest' } }
          }
        },
        responses: {
          '200': {
            description: 'Đăng xuất thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LogoutResponse' } } }
          },
          '401': {
            description: 'Refresh token không hợp lệ hoặc đã thu hồi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Lấy thông tin người dùng đang đăng nhập',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Lấy thông tin thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/UserProfile' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Chưa xác thực (Không có token, hoặc token hết hạn)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    
    // ==========================================
    // MODULE 2B: CURRICULUM
    // ==========================================
    '/curriculum/programs': {
      get: {
        tags: ['Curriculum'],
        summary: 'Lấy danh sách các Chương trình học',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Lấy danh sách thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ProgramSchema' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Curriculum'],
        summary: 'Tạo mới một Chương trình học (ROOT, DIRECTOR, ACADEMIC)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateProgramRequest' } }
          }
        },
        responses: {
          '201': {
            description: 'Tạo thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ProgramSchema' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/curriculum/programs/{id}': {
      get: {
        tags: ['Curriculum'],
        summary: 'Lấy thông tin chi tiết Chương trình học',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Lấy thông tin thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ProgramSchema' }
                  }
                }
              }
            }
          }
        }
      },
      patch: {
        tags: ['Curriculum'],
        summary: 'Cập nhật thông tin Chương trình học',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateProgramRequest' } }
          }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ProgramSchema' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/curriculum/programs/{id}/units': {
      get: {
        tags: ['Curriculum'],
        summary: 'Lấy danh sách Unit của Chương trình học',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/UnitSchema' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Curriculum'],
        summary: 'Tạo mới Unit cho Program (Tự động sinh 7 Lessons Default)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateUnitRequest' } }
          }
        },
        responses: {
          '201': {
            description: 'Tạo Unit thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/UnitWithLessonsSchema' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/curriculum/units/{unitId}': {
      get: {
        tags: ['Curriculum'],
        summary: 'Lấy chi tiết Unit kèm danh sách Lessons đính kèm',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'unitId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Lấy chi tiết thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/UnitWithLessonsSchema' }
                  }
                }
              }
            }
          }
        }
      },
      patch: {
        tags: ['Curriculum'],
        summary: 'Cập nhật thông tin Unit',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'unitId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateUnitRequest' } }
          }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/UnitSchema' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ==========================================
    // CURRICULUM IMPORT/EXPORT (JSON)
    // ==========================================
    '/curriculum/export': {
      get: {
        tags: ['Curriculum'],
        summary: 'Xuất Curriculum ra JSON (program/unit/lesson)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'scope', in: 'query', required: false, schema: { type: 'string', enum: ['program', 'unit', 'lesson'] }, default: 'lesson' },
          { name: 'programCodes', in: 'query', required: false, schema: { type: 'string' }, description: 'CSV code chương trình, ví dụ: ST1,ST2' }
        ],
        responses: {
          '200': {
            description: 'Trả về JSON dữ liệu curriculum',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      }
    },
    '/curriculum/import': {
      post: {
        tags: ['Curriculum'],
        summary: 'Import/Upsert Curriculum từ JSON',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } }
        },
        responses: {
          '200': {
            description: 'Import thành công',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      }
    },
    
    // ==========================================
    // MODULE 3A: STUDENTS & ENROLLMENTS
    // ==========================================
    '/students': {
      get: {
        tags: ['Students'],
        summary: 'Lấy danh sách Học viên',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedStudentsResponse' } } }
          }
        }
      },
      post: {
        tags: ['Students'],
        summary: 'Tạo mới Học viên',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStudentRequest' } } }
        },
        responses: {
          '201': {
            description: 'Tạo thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Student' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/students/export': {
      get: {
        tags: ['Students'],
        summary: 'Xuất danh sách Học viên ra Excel',
        description: 'Quyền: yêu cầu permission STUDENT_READ. Xuất theo filter search và limit.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', required: false, schema: { type: 'string' }, description: 'Tìm theo tên/SĐT/Email (tùy backend hỗ trợ)' },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 1000 }, description: 'Giới hạn số dòng xuất.' },
        ],
        responses: {
          '200': {
            description: 'Tải file Excel thành công',
            headers: {
              'Content-Disposition': {
                schema: { type: 'string' },
                description: 'Tên file đính kèm (attachment; filename="...")',
              },
            },
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },
    '/students/{id}': {
      get: {
        tags: ['Students'],
        summary: 'Lấy chi tiết Học viên',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Student' }
                  }
                }
              }
            }
          }
        }
      },
      patch: {
        tags: ['Students'],
        summary: 'Cập nhật Học viên',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateStudentRequest' } } }
        },
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Student' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/students/{id}/enrollments': {
      get: {
        tags: ['Students'],
        summary: 'Lấy danh sách các lớp học đã ghi danh của Học viên',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Enrollment' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/enrollments': {
      post: {
        tags: ['Students'],
        summary: 'Tạo mới Ghi danh (Đăng ký học)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateEnrollmentRequest' } } }
        },
        responses: {
          '201': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Enrollment' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/enrollments/{id}/status': {
      patch: {
        tags: ['Students'],
        summary: 'Cập nhật trạng thái Ghi danh',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateEnrollmentStatusRequest' } } }
        },
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Enrollment' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/enrollments/{id}/transfer': {
      post: {
        tags: ['Students'],
        summary: 'Chuyển lớp cho Học viên',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferEnrollmentRequest' } } }
        },
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        oldEnrollment: { $ref: '#/components/schemas/Enrollment' },
                        newEnrollment: { $ref: '#/components/schemas/Enrollment' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    
    // ==========================================
    // MODULE 4: CLASSES
    // ==========================================
    '/classes': {
      get: {
        tags: ['Classes'],
        summary: 'Lấy danh sách các Lớp học',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'programId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'CLOSED'] } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: {
          '200': {
            description: 'Lấy danh sách thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedClassesResponse' } } }
          }
        }
      },
      post: {
        tags: ['Classes'],
        summary: 'Tạo mới một Lớp học',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateClassRequest' } } }
        },
        responses: {
          '201': {
            description: 'Tạo Lớp học thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Class' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/classes/{id}': {
      get: {
        tags: ['Classes'],
        summary: 'Lấy chi tiết Lớp học (bao gồm schedules và staff)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Lấy thông tin thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ClassDetail' }
                  }
                }
              }
            }
          }
        }
      },
      patch: {
        tags: ['Classes'],
        summary: 'Cập nhật Lớp học',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateClassRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Class' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/classes/{id}/schedules': {
      put: {
        tags: ['Classes'],
        summary: 'Cập nhật toàn bộ Lịch học (Upsert)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpsertSchedulesRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật lịch học thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ClassSchedule' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/classes/{id}/schedule': {
      get: {
        tags: ['Classes'],
        summary: 'Lấy Lịch học của Lớp học (Alias)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ClassSchedule' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/classes/{id}/staff': {
      post: {
        tags: ['Classes'],
        summary: 'Phân công Giáo viên/Staff vào Lớp học',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssignStaffRequest' } } }
        },
        responses: {
          '200': {
            description: 'Phân công thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ClassStaff' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Classes'],
        summary: 'Hủy phân công Giáo viên/Staff (Dùng Body Request)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RemoveStaffRequest' } } }
        },
        responses: {
          '200': {
            description: 'Hủy phân công thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object', nullable: true }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/classes/{id}/roster': {
      get: {
        tags: ['Classes'],
        summary: 'Danh sách Điểm danh (Học viên đang ACTIVE trong lớp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/RosterStudent' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/classes/{id}/enrollments': {
      post: {
        tags: ['Classes'],
        summary: 'Thêm học viên vào lớp (Tạo mới hoặc thêm từ enrollment cũ)',
        description: 'Quyền: ROOT, DIRECTOR, ACADEMIC. Nếu chỉ truyền enrollmentId, sẽ cập nhật classId của enrollment cũ. Nếu truyền studentId, chương trình và startDate sẽ tạo mới enrollment.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 
            'application/json': { 
              schema: { 
                type: 'object',
                properties: {
                  enrollmentId: { type: 'string', format: 'uuid' },
                  studentId: { type: 'string', format: 'uuid' },
                  programId: { type: 'string', format: 'uuid' },
                  startDate: { type: 'string', format: 'date' }
                }
              } 
            } 
          }
        },
        responses: {
          '201': {
            description: 'Thêm học viên/enrollment thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'object' } } } } }
          }
        }
      }
    },
    '/classes/{id}/close': {
      post: {
        tags: ['Classes'],
        summary: 'Đóng lớp học',
        description: 'Quyền: ROOT, DIRECTOR, ACADEMIC. Cập nhật status lớp -> CLOSED, không sửa đổi trạng thái enrollment (để Academic tự xử).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Đóng lớp thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'object' } } } } }
          },
          '401': { description: 'Chưa xác thực', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Không có quyền', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Không tìm thấy lớp', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/classes/{id}/promotion': {
      post: {
        tags: ['Classes'],
        summary: 'Promote học viên sang lớp mới',
        description: 'Quyền: ROOT, ACADEMIC. Chuyển học viên ACTIVE sang lớp đích, có thể đóng lớp nguồn.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID lớp nguồn' }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PromoteClassRequest' } } }
        },
        responses: {
          '200': {
            description: 'Promotion thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        promotedCount: { type: 'integer' },
                        closedSourceClass: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Chưa xác thực', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Không có quyền', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Không tìm thấy lớp', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    
    // ==========================================
    // MODULE 5: SESSIONS
    // ==========================================
    '/classes/{id}/sessions/generate': {
      post: {
        tags: ['Sessions'],
        summary: 'Sinh danh sách buổi học dự kiến (ROOT, DIRECTOR, ACADEMIC)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateSessionsRequest' } } }
        },
        responses: {
          '201': {
            description: 'Tạo danh sách buổi học thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionsListResponse' } } }
          }
        }
      }
    },
    '/classes/{id}/sessions': {
      get: {
        tags: ['Sessions'],
        summary: 'Lấy danh sách buổi học của Lớp học (ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT, TEACHER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Lấy danh sách thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionsListResponse' } } }
          }
        }
      }
    },
    '/sessions/{sessionId}': {
      get: {
        tags: ['Sessions'],
        summary: 'Lấy chi tiết Buổi học (ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT, TEACHER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Lấy thông tin thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionResponse' } } }
          }
        }
      },
      patch: {
        tags: ['Sessions'],
        summary: 'Cập nhật Buổi học (Đổi lịch, Giáo viên dạy thay) (ROOT, DIRECTOR, ACADEMIC)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSessionRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionResponse' } } }
          }
        }
      }
    },
    
    // ==========================================
    // MODULE 6: FEEDBACK & SCORES
    // ==========================================
    '/classes/{classId}/export': {
      get: {
        tags: ['Feedback'],
        summary: 'Xuất báo cáo điểm danh & nhận xét (Excel)',
        description: 'Quyền: ROOT, DIRECTOR, ACADEMIC luôn được quyền. TEACHER chỉ được export lớp mình có dạy. Các vai trò khác bị cấm.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'classId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'fromDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'toDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'sessionId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Nếu truyền sessionId, hệ thống chỉ export đúng buổi học đó (và verify thuộc classId).' },
          { name: 'includeScores', in: 'query', required: false, schema: { type: 'boolean', default: true }, description: 'Có kèm các cột điểm số hay không (QUIZ/MIDTERM/FINAL).' }
        ],
        responses: {
          '200': {
            description: 'File Excel trả về',
            headers: {
              'Content-Disposition': {
                schema: { type: 'string' },
                description: 'Tên file đính kèm (attachment; filename="...")',
              },
            },
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      }
    },
    '/sessions/{sessionId}/feedback': {
      get: {
        tags: ['Feedback'],
        summary: 'Lấy danh sách nhận xét của buổi học (ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT, TEACHER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Lấy nhận xét thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionFeedbackResponse' } } }
          },
          '401': { description: 'Chưa xác thực', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Không có quyền', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Không tìm thấy buổi học', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/sessions/{sessionId}/feedback/template': {
      get: {
        tags: ['Feedback'],
        summary: 'Tải template Excel nhập nhận xét cho buổi học',
        description: 'Quyền: DIRECTOR, ACADEMIC, TEACHER. Trả về file Excel có sẵn roster, import lại qua POST /feedback/import.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'File Excel template',
            headers: {
              'Content-Disposition': { schema: { type: 'string' }, description: 'attachment; filename="..."' }
            },
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          '401': { description: 'Chưa xác thực', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Không có quyền', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Không tìm thấy buổi học', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/sessions/{sessionId}/feedback/import': {
      post: {
        tags: ['Feedback'],
        summary: 'Import nhận xét từ file Excel (sau khi tải template)',
        description: 'Quyền: TEACHER (buổi mình dạy), ACADEMIC, ROOT. Upload file .xlsx đã điền nhận xét.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'File Excel .xlsx' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Import thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } } } }
          },
          '400': { description: 'File không hợp lệ hoặc thiếu dữ liệu', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Chưa xác thực', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Không có quyền', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Không tìm thấy buổi học', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/sessions/{sessionId}/feedback/upsert': {
      post: {
        tags: ['Feedback'],
        summary: 'Cập nhật nhận xét của buổi học (ROOT, DIRECTOR, ACADEMIC, TEACHER)',
        description: 'Lưu ý: Nếu là TEACHER, chỉ được cập nhật cho buổi học mà mình dạy.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpsertFeedbackRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                       type: 'array',
                       items: { $ref: '#/components/schemas/FeedbackItem' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/students/{id}/feedback': {
      get: {
        tags: ['Feedback'],
        summary: 'Lấy lịch sử nhận xét của học viên (ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT, TEACHER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'Lấy lịch sử nhận xét thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentFeedbackHistoryResponse' } } }
          }
        }
      }
    },
    '/sessions/{sessionId}/scores/upsert': {
      post: {
        tags: ['Scores'],
        summary: 'Cập nhật điểm số cho buổi học (TEST/MIDTERM/FINAL) (ROOT, DIRECTOR, ACADEMIC, TEACHER)',
        description: 'Lưu ý: TEACHER chỉ được cập nhật buổi học mình dạy. Không thể nhập điểm cho buổi học NORMAL.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpsertScoresRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật điểm thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                       type: 'array',
                       items: { $ref: '#/components/schemas/ScoreItem' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/students/{id}/scores': {
      get: {
        tags: ['Scores'],
        summary: 'Lấy lịch sử điểm số của học viên (ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT, TEACHER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'Lấy lịch sử điểm số thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentScoresHistoryResponse' } } }
          }
        }
      }
    },

    // ==========================================
    // MODULE 7: TRIALS PATHS
    // ==========================================
    '/trials': {
      get: {
        tags: ['Trials'],
        summary: 'Lấy danh sách Khách hàng học thử (Trials)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', required: false, schema: { type: 'string' }, description: 'Tìm theo tên, điện thoại, email' },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['NEW', 'CONTACTED', 'SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CONVERTED', 'CLOSED'] } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'Lấy danh sách thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedTrialsResponse' } } }
          }
        }
      },
      post: {
        tags: ['Trials'],
        summary: 'Tạo mới một Khách hàng học thử',
        description: 'Flow: Tạo Lead nhận tư vấn -> Xếp lịch học thử -> Chuyển đổi thành học viên',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTrialRequest' } } }
        },
        responses: {
          '201': {
            description: 'Tạo thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TrialStatusResponse' } } }
          }
        }
      }
    },
    '/trials/{id}': {
      get: {
        tags: ['Trials'],
        summary: 'Lấy chi tiết Khách hàng học thử kèm lịch hẹn (nếu có)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TrialStatusResponse' } } }
          }
        }
      },
      patch: {
        tags: ['Trials'],
        summary: 'Cập nhật thông tin/trạng thái Khách hàng học thử',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateTrialRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TrialStatusResponse' } } }
          }
        }
      }
    },
    '/trials/{id}/schedule': {
      post: {
        tags: ['Trials'],
        summary: 'Đặt lịch hoặc cập nhật lịch học thử',
        description: 'Khi đặt lịch, trạng thái của Lead sẽ tự động chuyển từ NEW/CONTACTED sang SCHEDULED',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleTrialRequest' } } }
        },
        responses: {
          '200': {
            description: 'Đặt lịch thành công',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    lead: { $ref: '#/components/schemas/TrialLead' },
                    schedule: { $ref: '#/components/schemas/TrialSchedule' }
                  }
                }
              }
            } } }
          }
        }
      }
    },
    '/trials/{id}/convert': {
      post: {
        tags: ['Trials'],
        summary: 'Chuyển đổi Khách học thử thành Học viên chính thức',
        description: 'Hành động tạo mới 1 Student, tạo Enrollment vào Class, và chuyển trạng thái TrialLead thành CONVERTED',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ConvertTrialRequest' } } }
        },
        responses: {
          '200': {
            description: 'Chuyển đổi thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ConvertTrialResponse' } } }
          }
        }
      }
    },
    '/trials/export': {
      get: {
        tags: ['Trials'],
        summary: 'Xuất danh sách Trial Leads ra Excel',
        description: 'Quyền: yêu cầu permission TRIALS_READ. Xuất theo điều kiện search/status.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', required: false, schema: { type: 'string' }, description: 'Tìm theo tên, điện thoại, email.' },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['NEW', 'CONTACTED', 'SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CONVERTED', 'CLOSED'] } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 1000 }, description: 'Giới hạn số dòng xuất.' },
        ],
        responses: {
          '200': {
            description: 'Tải file Excel thành công',
            headers: {
              'Content-Disposition': {
                schema: { type: 'string' },
                description: 'Tên file đính kèm (attachment; filename="...")',
              },
            },
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },

    // ==========================================
    // MODULE 8: FINANCE PATHS
    // ==========================================

    '/finance/fee-plans': {
      get: {
        tags: ['Finance'],
        summary: 'Danh sách Gói học phí',
        description: 'Quyền: ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT. Lọc theo programId nếu cần.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'programId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Lọc theo chương trình học' }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/FeePlan' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Finance'],
        summary: 'Tạo mới Gói học phí',
        description: 'Quyền: ROOT, DIRECTOR, ACCOUNTANT.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateFeePlanRequest' } } }
        },
        responses: {
          '201': {
            description: 'Tạo thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/FeePlan' } } } } }
          }
        }
      }
    },

    '/finance/fee-plans/{id}': {
      patch: {
        tags: ['Finance'],
        summary: 'Cập nhật Gói học phí',
        description: 'Quyền: ROOT, DIRECTOR, ACCOUNTANT.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateFeePlanRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/FeePlan' } } } } }
          }
        }
      }
    },

    '/finance/invoices/export': {
      get: {
        tags: ['Finance'],
        summary: 'Xuất danh sách hóa đơn ra Excel',
        description: 'Quyền: yêu cầu permission FINANCE_READ (permission-based).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'fromDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
            description: 'Lọc theo ngày tạo (created_at >= fromDate)'
          },
          {
            name: 'toDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
            description: 'Lọc theo ngày tạo (created_at <= toDate)'
          },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELED'] } },
          { name: 'enrollmentId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'overdue', in: 'query', required: false, schema: { type: 'boolean' }, description: 'Nếu true: chỉ xuất các hóa đơn quá hạn hiệu lực (due_date < hôm nay và còn nợ).' }
        ],
        responses: {
          '200': {
            description: 'Tải file Excel thành công',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      }
    },
    '/finance/payments/export': {
      get: {
        tags: ['Finance'],
        summary: 'Xuất danh sách thanh toán (payments) ra Excel',
        description: 'Quyền: yêu cầu permission FINANCE_READ (permission-based). Filter theo paid_at (tính theo date).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fromDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'toDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'method', in: 'query', required: false, schema: { type: 'string' }, description: 'Lọc theo payment method' },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 5000 }, description: 'Giới hạn số dòng xuất.' },
        ],
        responses: {
          '200': {
            description: 'Tải file Excel thành công',
            headers: {
              'Content-Disposition': {
                schema: { type: 'string' },
                description: 'Tên file đính kèm (attachment; filename="...")',
              },
            },
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },

    '/finance/invoices': {
      get: {
        tags: ['Finance'],
        summary: 'Danh sách Hóa đơn học phí (có phân trang)',
        description: 'Quyền: ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELED'] } },
          { name: 'enrollmentId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'overdue', in: 'query', required: false, schema: { type: 'boolean' }, description: 'true: chỉ lấy hóa đơn quá hạn (due_date < hôm nay và còn nợ)' },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedInvoicesResponse' } } }
          },
          '401': { description: 'Chưa xác thực', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Không có quyền', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      post: {
        tags: ['Finance'],
        summary: 'Tạo mới Hóa đơn học phí',
        description: 'Quyền: ROOT, DIRECTOR, ACCOUNTANT. Hóa đơn tạo mới sẽ ở trạng thái DRAFT.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateInvoiceRequest' } } }
        },
        responses: {
          '201': {
            description: 'Tạo thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/Invoice' } } } } }
          }
        }
      }
    },

    '/finance/invoices/{id}': {
      get: {
        tags: ['Finance'],
        summary: 'Chi tiết Hóa đơn kèm thanh toán',
        description: 'Quyền: ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT. Trả về invoice + payments + paidAmount + remainingAmount.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceDetailsResponse' } } }
          }
        }
      }
    },

    '/finance/invoices/{id}/status': {
      patch: {
        tags: ['Finance'],
        summary: 'Cập nhật trạng thái Hóa đơn',
        description: [
          'Quyền: ROOT, DIRECTOR, ACCOUNTANT.',
          '',
          '**Luồng trạng thái hợp lệ:**',
          '- DRAFT → ISSUED (set issued_at = now()) hoặc CANCELED',
          '- ISSUED → PAID hoặc OVERDUE hoặc CANCELED',
          '- OVERDUE → PAID hoặc CANCELED',
          '- PAID hoặc CANCELED: không thể thay đổi tiếp'
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateInvoiceStatusRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/Invoice' } } } } }
          },
          '400': {
            description: 'Lỗi nghiệp vụ - trạng thái không hợp lệ',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },

    '/finance/payments': {
      post: {
        tags: ['Finance'],
        summary: 'Tạo mới Khoản thanh toán',
        description: [
          'Quyền: ROOT, DIRECTOR, ACCOUNTANT.',
          '',
          '**Quy tắc kinh doanh:**',
          '- Hóa đơn CANCELED → Từ chối (400)',
          '- Hóa đơn DRAFT → Tự động chuyển sang ISSUED trước khi nhận tiền',
          '- Số tiền không được vượt quá số tiền còn lại (remainingAmount)',
          '- Nếu thanh toán đủ → Tự động chuyển hóa đơn sang PAID'
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentRequest' } } }
        },
        responses: {
          '201': {
            description: 'Thanh toán thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/Payment' } } } } }
          },
          '400': {
            description: 'Lỗi - số tiền vượt quá remainingAmount hoặc hóa đơn đã hủy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },

    '/students/{id}/finance': {
      get: {
        tags: ['Finance'],
        summary: 'Tóm tắt tài chính của Học viên',
        description: 'Quyền: ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT. Trả về toàn bộ enrollments, invoices, paidAmount, remainingAmount và summary tổng hợp.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID của học viên' },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'Thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentFinanceResponse' } } }
          }
        }
      }
    },

    // ==========================================
    // MODULE 9: SYSTEM – AUDIT LOGS & NOTIFICATIONS
    // ==========================================

    '/system/audit-logs': {
      get: {
        tags: ['System'],
        summary: 'Lấy danh sách Audit Log hệ thống',
        description: [
          'Quyền: **ROOT, DIRECTOR**.',
          'Mỗi log ghi lại một hành động trong hệ thống: ai làm gì, với đối tượng nào, khi nào.',
          'Trường `meta` là JSON object linh hoạt — có thể chứa IP, user-agent, payload diff, kết quả thao tác, v.v.',
          'Hỗ trợ lọc theo actorUserId, action, fromDate, toDate và phân trang.'
        ].join(' '),
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'actorUserId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
            description: 'Lọc theo UUID người thực hiện hành động'
          },
          {
            name: 'action',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'AUTH_LOGIN' },
            description: 'Lọc theo tên hành động, ví dụ: AUTH_LOGIN, STUDENT_CREATE'
          },
          {
            name: 'fromDate',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time', example: '2026-03-01T00:00:00Z' },
            description: 'Lọc từ ngày (created_at >= fromDate)'
          },
          {
            name: 'toDate',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time', example: '2026-03-31T23:59:59Z' },
            description: 'Lọc đến ngày (created_at <= toDate)'
          },
          { name: 'limit',  in: 'query', required: false, schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0, minimum: 0 } }
        ],
        responses: {
          '200': {
            description: 'Lấy danh sách thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedAuditLogsResponse' } } }
          },
          '401': {
            description: 'Chưa xác thực',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          '403': {
            description: 'Không có quyền (yêu cầu ROOT hoặc DIRECTOR)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },

    '/system/notifications': {
      get: {
        tags: ['System'],
        summary: 'Lấy danh sách thông báo của user hiện tại',
        description: [
          'Quyền: **Mọi user đã đăng nhập**.',
          'userId tự động lấy từ JWT token — user chỉ thấy thông báo của chính mình.',
          'Dùng `isRead=false` để lấy danh sách thông báo chưa đọc (badge count).'
        ].join(' '),
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'isRead',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false'] },
            description: 'Lọc theo trạng thái đọc. Bỏ qua = lấy tất cả'
          },
          { name: 'limit',  in: 'query', required: false, schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0, minimum: 0 } }
        ],
        responses: {
          '200': {
            description: 'Lấy danh sách thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedNotificationsResponse' } } }
          },
          '401': {
            description: 'Chưa xác thực',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },

    '/system/notifications/read-all': {
      patch: {
        tags: ['System'],
        summary: 'Đánh dấu tất cả thông báo của user hiện tại là đã đọc',
        description: 'Quyền: **Mọi user đã đăng nhập**.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Đã đánh dấu tất cả thông báo là đã đọc' },
                    updatedCount: { type: 'integer', example: 5 }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Chưa xác thực',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },

    '/system/notifications/{id}/read': {
      patch: {
        tags: ['System'],
        summary: 'Đánh dấu thông báo là đã đọc',
        description: [
          'Quyền: **Mọi user đã đăng nhập**.',
          'User chỉ có thể đánh dấu đã đọc thông báo của chính mình.',
          'Nếu notificationId không thuộc user hiện tại → trả về 404.'
        ].join(' '),
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID của thông báo cần đánh dấu đã đọc'
          }
        ],
        responses: {
          '200': {
            description: 'Đánh dấu thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/Notification' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Chưa xác thực',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          '404': {
            description: 'Không tìm thấy thông báo hoặc không có quyền cập nhật',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },

    '/system/users': {
      get: {
        tags: ['System'],
        summary: 'Lấy danh sách Users (Phân trang, tìm kiếm, lọc)',
        description: 'Quyền: ROOT',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Tìm theo email hoặc fullName' },
          { name: 'roleCode', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          '200': {
            description: 'Lấy thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedUsersResponse' } } }
          }
        }
      },
      post: {
        tags: ['System'],
        summary: 'Tạo User mới',
        description: 'Quyền: ROOT',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserRequest' } } }
        },
        responses: {
          '201': {
            description: 'Tạo thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SystemUser' } } } } }
          }
        }
      }
    },
    '/system/users/{id}': {
      get: {
        tags: ['System'],
        summary: 'Lấy thông tin User theo ID',
        description: 'Quyền: ROOT',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SystemUser' } } } } }
          }
        }
      },
      patch: {
        tags: ['System'],
        summary: 'Cập nhật thông tin User cơ bản',
        description: 'Quyền: ROOT',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } }
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SystemUser' } } } } }
          }
        }
      }
    },
    '/system/users/{id}/roles': {
      post: {
        tags: ['System'],
        summary: 'Gán Role cho User',
        description: 'Quyền: ROOT',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssignRoleRequest' } } }
        },
        responses: {
          '200': {
            description: 'Gán thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { message: { type: 'string' } } } } } } }
          }
        }
      }
    },
    '/system/users/{id}/roles/{roleCode}': {
      delete: {
        tags: ['System'],
        summary: 'Thu hồi Role của User',
        description: 'Quyền: ROOT',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'roleCode', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Thu hồi thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { message: { type: 'string' } } } } } } }
          }
        }
      }
    }
  };
}
