import type { BarcodeType } from '../types';

/**
 * Barcode-Erzeugung ohne zusätzliche Abhängigkeiten.
 * Unterstützt Code 128 (B) für alphanumerische Kundennummern und EAN-13
 * für 12- oder 13-stellige Nummern. Die Tabellen entsprechen dem Standard.
 */

const CODE128_BARS = [
  '11011001100', '11001101100', '11001100110', '10010011000',
  '10010001100', '10001001100', '10011001000', '10011000100',
  '10001100100', '11001001000', '11001000100', '11000100100',
  '10110011100', '10011011100', '10011001110', '10111001100',
  '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110',
  '11101001100', '11100101100', '11100100110', '11101100100',
  '11100110100', '11100110010', '11011011000', '11011000110',
  '11000110110', '10100011000', '10001011000', '10001000110',
  '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110',
  '10001101110', '10111011000', '10111000110', '10001110110',
  '11101110110', '11010001110', '11000101110', '11011101000',
  '11011100010', '11011101110', '11101011000', '11101000110',
  '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000',
  '10100001100', '10010110000', '10010000110', '10000101100',
  '10000100110', '10110010000', '10110000100', '10011010000',
  '10011000010', '10000110100', '10000110010', '11000010010',
  '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100',
  '10011110100', '10011110010', '11110100100', '11110010100',
  '11110010010', '11011011110', '11011110110', '11110110110',
  '10101111000', '10100011110', '10001011110', '10111101000',
  '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100',
  '11010010000', '11010011100', '1100011101011',
];

const START_B = 104;
const STOP = 106;

const EAN_L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];

const EAN_G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];

const EAN_R = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];

const EAN13_STRUCTURE = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

export interface EncodedBarcode {
  /** Modulbreiten: '1' = schwarzer Balken, '0' = Lücke. */
  modules: string;
  /** Lesbarer Text unter dem Barcode. */
  human: string;
  format: 'Code 128' | 'EAN-13';
}

export function encodeCode128(value: string): EncodedBarcode | null {
  const text = value.trim();
  if (!text) return null;

  const codes: number[] = [START_B];
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    // Code 128 B deckt ASCII 32 bis 126 ab.
    if (code < 32 || code > 126) return null;
    codes.push(code - 32);
  }

  let checksum = codes[0];
  for (let index = 1; index < codes.length; index += 1) {
    checksum += codes[index] * index;
  }
  codes.push(checksum % 103, STOP);

  return {
    modules: codes.map((code) => CODE128_BARS[code]).join(''),
    human: text,
    format: 'Code 128',
  };
}

export function ean13CheckDigit(twelveDigits: string): number {
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    const digit = Number(twelveDigits[index]);
    sum += index % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function encodeEan13(value: string): EncodedBarcode | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12 && digits.length !== 13) return null;

  const twelve = digits.slice(0, 12);
  const full = digits.length === 13 ? digits : twelve + ean13CheckDigit(twelve);
  const structure = EAN13_STRUCTURE[Number(full[0])];

  let modules = '101';
  for (let index = 0; index < 6; index += 1) {
    const digit = Number(full[index + 1]);
    modules += structure[index] === 'L' ? EAN_L[digit] : EAN_G[digit];
  }
  modules += '01010';
  for (let index = 0; index < 6; index += 1) {
    modules += EAN_R[Number(full[index + 7])];
  }
  modules += '101';

  const human = `${full[0]} ${full.slice(1, 7)} ${full.slice(7)}`;
  return { modules, human, format: 'EAN-13' };
}

export function encodeBarcode(
  value: string,
  type: BarcodeType = 'auto',
): EncodedBarcode | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (type === 'code128') return encodeCode128(trimmed);
  if (type === 'ean13') return encodeEan13(trimmed);

  const digits = trimmed.replace(/\D/g, '');
  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.length === trimmed.replace(/\s/g, '').length
  ) {
    return encodeEan13(trimmed);
  }
  return encodeCode128(trimmed);
}
