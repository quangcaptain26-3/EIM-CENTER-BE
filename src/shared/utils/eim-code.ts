/**
 * Tạo mã EIM theo định dạng: EIM-{prefix}-{5 chữ số ngẫu nhiên}
 *
 * @example
 *   generateEimCode('GV')  // → 'EIM-GV-47291'
 *   generateEimCode('ADM') // → 'EIM-ADM-03812'
 */
export function generateEimCode(prefix: string): string {
  if (!prefix || prefix.trim() === '') {
    throw new Error('[generateEimCode] prefix must not be empty');
  }

  // Số ngẫu nhiên 5 chữ số (00000 – 99999)
  const random = Math.floor(Math.random() * 100_000);
  const digits = random.toString().padStart(5, '0');

  return `EIM-${prefix.trim().toUpperCase()}-${digits}`;
}
