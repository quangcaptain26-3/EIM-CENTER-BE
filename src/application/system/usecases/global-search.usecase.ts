/**
 * Tìm kiếm tổng hợp (Cmd+K) — OVERVIEW §11 (mã EIM-HS, SĐT, full-text…).
 *
 * Cách vận hành:
 * - Nhận diện pattern: mã học sinh, mã GV, Số điện thoại 10–11 số → query tối ưu nhánh tương ứng; ngược lại dùng full-text/materialized view qua `ISearchRepo`.
 * - Giới hạn số dòng mỗi loại để phản hồi nhanh; ưu tiên exact code match khi sort.
 */
import { SearchDto } from '../dtos/search.dto';
import { ISearchRepo } from '../../../domain/system/repositories/search.repo.port';

export class GlobalSearchUseCase {
  constructor(
    private readonly searchRepo: ISearchRepo,
  ) {}

  async execute(dto: SearchDto) {
    const { q } = dto;
    const limitPerEntity = 5; // Fixed limit of 5 per entity
    const query = String(q).trim();
    const queryLower = query.toLowerCase();

    const isEimStudentCode = /^EIM-HS-\d{5}$/i.test(query);
    const isEimTeacherCode = /^EIM-GV-\d{5}$/i.test(query);
    const isPhoneDigits = /^\d{10,11}$/.test(query);

    const sortExactFirst = <T,>(items: T[], getCode: (item: T) => string | null | undefined) => {
      // Spec: exact match trước, fuzzy sau.
      // Trong nhánh full-text, code match sẽ ít khi xuất hiện; nhưng ta vẫn ép ưu tiên bằng sort ổn định.
      return items
        .map((item, idx) => ({
          item,
          idx,
          isExact: (getCode(item) ?? '').toLowerCase() === queryLower,
        }))
        .sort((a, b) => {
          if (a.isExact !== b.isExact) return a.isExact ? -1 : 1;
          return a.idx - b.idx;
        })
        .map((x) => x.item);
    };

    // 1) Multi-pattern recognition
    // - EIM-HS-xxxxx → exact student_code
    // - EIM-GV-xxxxx → exact user_code
    // - 10-11 digits → match parent_phone (exact)
    if (isEimStudentCode) {
      const students = await this.searchRepo.searchStudentsByCode(query, limitPerEntity);
      return {
        students: sortExactFirst(students, (s) => s.studentCode),
        users: [],
        classes: [],
      };
    }

    if (isEimTeacherCode) {
      const users = await this.searchRepo.searchUsersByCode(query, undefined, limitPerEntity);
      return {
        students: [],
        users: sortExactFirst(users, (u) => u.userCode),
        classes: [],
      };
    }

    if (isPhoneDigits) {
      const students = await this.searchRepo.searchStudentsByParentPhone(query, limitPerEntity);
      return {
        students: sortExactFirst(students, (s) => s.parentPhone),
        users: [],
        classes: [],
      };
    }

    // 2) Full-text fallback
    const [students, users, classes] = await Promise.all([
      this.searchRepo.searchStudentsFts(query, limitPerEntity).catch((err) => {
        console.error('[GlobalSearch] searchStudentsFts failed:', err);
        return [];
      }),
      this.searchRepo.searchUsersFts(query, undefined, limitPerEntity).catch((err) => {
        console.error('[GlobalSearch] searchUsersFts failed:', err);
        return [];
      }),
      this.searchRepo.searchClasses(query, limitPerEntity).catch((err) => {
        console.error('[GlobalSearch] searchClasses failed:', err);
        return [];
      }),
    ]);

    return {
      students: sortExactFirst(students, (s) => s.studentCode),
      users: sortExactFirst(users, (u) => u.userCode),
      classes: sortExactFirst(classes, (c) => c.classCode),
    };
  }
}
