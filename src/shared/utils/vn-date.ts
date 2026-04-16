/** So sánh ngày buổi học với "hôm nay" theo múi Asia/Ho_Chi_Minh (UTC+7). */
export function isSessionDateTodayHoChiMin(sessionDate: unknown): boolean {
  let ymd: string;
  if (sessionDate instanceof Date) {
    ymd = sessionDate.toISOString().slice(0, 10);
  } else if (typeof sessionDate === 'string') {
    ymd = sessionDate.slice(0, 10);
  } else {
    return false;
  }
  const todayVn = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return ymd === todayVn;
}
