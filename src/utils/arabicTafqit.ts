/**
 * Arabic Tafqit Helper: Convert Numbers to Arabic Spoken Currency Words
 * Pure TypeScript, zero external dependencies
 */
export function numberToArabicWords(amount: number): string {
  if (!amount || amount <= 0) return 'صفر جنيه مصري لا غير';

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(num: number): string {
    if (num < 20) return units[num];
    if (num < 100) {
      const u = num % 10;
      const t = Math.floor(num / 10);
      return u > 0 ? `${units[u]} و${tens[t]}` : tens[t];
    }
    const h = Math.floor(num / 100);
    const rem = num % 100;
    const remStr = rem > 0 ? ` و${convertGroup(rem)}` : '';
    return `${hundreds[h]}${remStr}`;
  }

  if (amount < 1000) {
    return `${convertGroup(amount)} جنيه مصري لا غير`;
  }

  if (amount < 1000000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    let thStr = '';
    if (thousands === 1) thStr = 'ألف';
    else if (thousands === 2) thStr = 'ألفان';
    else if (thousands >= 3 && thousands <= 10) thStr = `${units[thousands]} آلاف`;
    else thStr = `${convertGroup(thousands)} ألف`;

    const remStr = remainder > 0 ? ` و${convertGroup(remainder)}` : '';
    return `${thStr}${remStr} جنيه مصري لا غير`;
  }

  return `${amount.toLocaleString('ar-EG')} جنيه مصري لا غير`;
}
