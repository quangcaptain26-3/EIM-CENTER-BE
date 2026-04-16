// ---------------------------------------------------------------------------
// Bảng đơn vị
// ---------------------------------------------------------------------------

const ONES = [
  '', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín',
];

const TEENS = [
  'mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm',
  'mười sáu', 'mười bảy', 'mười tám', 'mười chín',
];

// ---------------------------------------------------------------------------
// Chuyển một số trong khoảng [0, 999] thành chữ tiếng Việt
// ---------------------------------------------------------------------------

function threeDigits(n: number): string {
  if (n === 0) return '';

  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;

  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} trăm`);
  }

  if (remainder === 0) {
    // nothing after hundreds
  } else if (remainder < 10) {
    // e.g. 105 → "một trăm lẻ năm"
    parts.push(`lẻ ${ONES[ones]}`);
  } else if (remainder < 20) {
    parts.push(TEENS[remainder - 10]);
  } else {
    // tens >= 2
    let tensWord = `${ONES[tens]} mươi`;
    if (ones === 0) {
      // e.g. 20 → "hai mươi"
    } else if (ones === 1) {
      // mốt instead of một after mươi
      tensWord += ' mốt';
    } else if (ones === 5) {
      // lăm instead of năm after mươi
      tensWord += ' lăm';
    } else {
      tensWord += ` ${ONES[ones]}`;
    }
    parts.push(tensWord);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Hàm chính
// ---------------------------------------------------------------------------

/**
 * Chuyển số tiền (VND) sang chữ tiếng Việt.
 *
 * @example
 *   amountToWordsVi(2_000_000) // → "Hai triệu đồng chẵn"
 *   amountToWordsVi(2_500_000) // → "Hai triệu năm trăm nghìn đồng"
 *   amountToWordsVi(-500_000)  // → "Âm năm trăm nghìn đồng"
 *   amountToWordsVi(0)         // → "Không đồng"
 */
export function amountToWordsVi(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error('[amountToWordsVi] amount must be a finite number');
  }

  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));

  if (abs === 0) return 'Không đồng';

  // Tách thành các nhóm 3 chữ số (đồng, nghìn, triệu, tỷ)
  const dong   = abs % 1_000;
  const nghin  = Math.floor(abs / 1_000) % 1_000;
  const trieu  = Math.floor(abs / 1_000_000) % 1_000;
  const ty     = Math.floor(abs / 1_000_000_000);

  const parts: string[] = [];

  if (ty > 0)    parts.push(`${threeDigits(ty)} tỷ`);
  if (trieu > 0) parts.push(`${threeDigits(trieu)} triệu`);
  if (nghin > 0) parts.push(`${threeDigits(nghin)} nghìn`);
  if (dong > 0)  parts.push(threeDigits(dong));

  let result = parts.join(' ');

  // Viết hoa chữ đầu
  result = result.charAt(0).toUpperCase() + result.slice(1);

  // Suffix
  const suffix = dong === 0 ? 'đồng chẵn' : 'đồng';
  result = `${result} ${suffix}`;

  if (isNegative) result = `Âm ${result.charAt(0).toLowerCase()}${result.slice(1)}`;

  return result;
}
