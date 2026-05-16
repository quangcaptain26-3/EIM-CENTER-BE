export class StudentEntity {
  constructor(
    public readonly id: string,
    public studentCode: string,
    public fullName: string,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date,
    public dob?: Date,
    public gender?: string,
    public address?: string,
    public schoolName?: string,
    public parentName?: string,
    public parentPhone?: string,
    public parentPhone2?: string,
    public parentZalo?: string,
    public currentLevel?: string,
    public testResult?: string,
    public createdBy?: string,
    /** Họ tên user `created_by` — chỉ có khi JOIN users (chi tiết học viên) */
    public createdByName?: string | null,
    /** Ghi danh / lớp hiển thị trên danh sách (JOIN enrollments), không có khi chỉ load bản ghi students */
    public activeClassCode?: string | null,
    public programName?: string | null,
    public enrollmentStatus?: string | null,
  ) {}
}
