import { EnrollmentEntity, EnrollmentStatus } from '../entities/enrollment.entity';

export class EnrollmentTransitionRule {
  /**
   * Kiểm tra chuyển trạng thái có hợp lệ không
   */
  canTransition(from: string, to: string, enrollment?: EnrollmentEntity): boolean {
    const reason = this.getBlockReason(from, to, enrollment);
    return reason === null;
  }

  /**
   * Lấy lý do block nếu chuyển trạng thái không hợp lệ
   */
  getBlockReason(from: string, to: string, enrollment?: EnrollmentEntity): string | null {
    if (from === to) return 'Trạng thái không đổi';

    // completed, dropped, transferred: terminal states, không thể chuyển tiếp
    if (['completed', 'dropped', 'transferred'].includes(from)) {
      return `Không thể chuyển trạng thái từ ${from}`;
    }

    switch (to) {
      case 'trial':
        if (from === 'pending') return null; // valid
        return 'Chỉ có thể chuyển sang trial từ pending';

      case 'active':
        if (from === 'pending') return null; // valid, sau khi đóng tiền (logic đóng tiền ngoài scope này)
        if (from === 'trial') return null;   // valid
        if (from === 'paused') return null;  // valid - resume
        return `Không thể chuyển sang active từ ${from}`;

      case 'paused':
        if (from === 'active') return null;  // valid
        return 'Chỉ có thể chuyển sang paused từ active';

      case 'dropped':
        if (from === 'trial' || from === 'active') return null; // valid
        return `Không thể chuyển sang dropped từ ${from}`;

      case 'transferred':
        if (from === 'active') return null; // valid
        return 'Chỉ có thể chuyển sang transferred từ active';

      case 'completed':
        if (from === 'active') {
          if (enrollment && enrollment.sessionsAttended < 24) {
            return 'Cần tham gia tối thiểu 24 buổi để hoàn thành'; // assuming 24 is the threshold
          }
          return null; // valid
        }
        return 'Chỉ có thể chuyển sang completed từ active';

      default:
        return `Trạng thái đích ${to} không hợp lệ`;
    }
  }
}
