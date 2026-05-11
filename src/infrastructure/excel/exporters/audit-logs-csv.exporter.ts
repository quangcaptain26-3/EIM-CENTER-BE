/**
 * CSV export cho audit logs — UTF-8 với BOM để Excel mở đúng tiếng Việt.
 */
export interface AuditLogCsvRow {
  eventTime: Date | string;
  actorLabel: string;
  actorRole: string;
  action: string;
  entityLabel: string;
  description: string;
}

function escapeCsvField(value: string): string {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export class AuditLogsCsvExporter {
  export(rows: AuditLogCsvRow[]): Buffer {
    const headers = ['Thời gian', 'Actor', 'Vai trò', 'Action', 'Đối tượng', 'Mô tả'];
    const lines: string[] = [headers.map(escapeCsvField).join(',')];

    for (const r of rows) {
      const time =
        r.eventTime instanceof Date
          ? r.eventTime.toISOString()
          : new Date(r.eventTime).toISOString();
      lines.push(
        [
          escapeCsvField(time),
          escapeCsvField(r.actorLabel),
          escapeCsvField(r.actorRole),
          escapeCsvField(r.action),
          escapeCsvField(r.entityLabel),
          escapeCsvField(r.description),
        ].join(','),
      );
    }

    const body = lines.join('\r\n');
    const bom = '\ufeff';
    return Buffer.from(bom + body, 'utf8');
  }
}
