import { z } from 'zod';

export const ImportTypeSchema = z.enum([
  'students',
  'users',
  'attendance',
  'enrollments',
  'holidays',
  'receipts',
]);
export type ImportType = z.infer<typeof ImportTypeSchema>;

export const ImportModeSchema = z.enum(['preview', 'commit']);
export type ImportMode = z.infer<typeof ImportModeSchema>;

export const ExportTypeSchema = z.enum([
  'students',
  'attendance-sheet',
  'payroll',
  'receipts',
  'debt-report',
  'audit-logs',
  'class-roster',
]);
export type ExportType = z.infer<typeof ExportTypeSchema>;

/** Kết quả export — dùng cho Content-Disposition & Content-Type */
export type ExportResult = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};
