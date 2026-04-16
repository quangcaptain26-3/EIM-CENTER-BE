export interface ImportError {
  row: number;
  field: string;
  reason: string;
}

export abstract class BaseImporter<T> {
  abstract parse(buffer: Buffer): Promise<{ valid: T[]; errors: ImportError[] }>;
  abstract getTemplate(): Promise<Buffer>;
}
