export class SessionGeneratorService {
  generate(params: {
    classId: string;
    teacherId: string;
    shift: 1 | 2;
    scheduleDays: number[]; // [2,4]
    startDate: Date;
    holidays: Array<{ date: Date; isRecurring: boolean }>;
    totalSessions?: number; // default 24
  }): Array<{
    classId: string;
    teacherId: string;
    sessionNo: number;
    sessionDate: Date;
    shift: 1 | 2;
    status: 'pending';
  }> {
    const totalSessions = params.totalSessions || 24;
    const sessions: any[] = [];
    let currentDate = new Date(params.startDate);
    
    // Reset time components to ensure pure date comparisons and increments
    currentDate.setHours(0, 0, 0, 0);

    const twoYearsLater = new Date(currentDate);
    twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);

    let sessionCount = 0;

    const isHoliday = (date: Date): boolean => {
        return params.holidays.some(h => {
          if (h.isRecurring) {
            return h.date.getMonth() === date.getMonth() && h.date.getDate() === date.getDate();
          }
          return h.date.getFullYear() === date.getFullYear() && 
                 h.date.getMonth() === date.getMonth() && 
                 h.date.getDate() === date.getDate();
        });
    };

    while (sessionCount < totalSessions) {
      if (currentDate > twoYearsLater) {
        throw new Error('Infinite loop detected: Cannot generate sessions within 2 years. Please check scheduleDays and holidays configuration.');
      }

      // getDay() ranges from 0 (Sun) to 6 (Sat)
      let dayOfWeek = currentDate.getDay() + 1;
      // Standardize to VN day logic where Sunday = 8
      if (dayOfWeek === 1) dayOfWeek = 8;

      if (params.scheduleDays.includes(dayOfWeek)) {
        if (!isHoliday(currentDate)) {
          sessionCount++;
          sessions.push({
            classId: params.classId,
            teacherId: params.teacherId,
            sessionNo: sessionCount,
            sessionDate: new Date(currentDate),
            shift: params.shift,
            status: 'pending'
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return sessions;
  }
}
