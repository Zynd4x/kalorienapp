import type { Food, Macros } from '../types';

const API_BASE = 'https://world.openfoodfacts.org';
const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'brands',
  'nutriments',
  'serving_size',
  'serving_quantity',
  'image_front_small_url',
  'quantity',
  'categories',
].join(',');

type JsonRecord = Record<string, unknown>;

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function firstNumber(record: JsonRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readMacros(nutriments: JsonRecord): Macros | null {
  const kcalDirect = firstNumber(nutriments, [
    'energy-kcal_100g',
    'energy-kcal',
    'energy-kcal_value',
  ]);
  const kj = firstNumber(nutriments, [
    'energy-kj_100g',
    'energy_100g',
    'energy-kj',
  ]);
  const kcal = kcalDirect ?? (kj !== undefined ? kj / 4.184 : undefined);

  if (kcal === undefined) return null;

  return {
    kcal: Math.round(kcal),
    protein: firstNumber(nutriments, ['proteins_100g', 'proteins']) ?? 0,
    carbs: firstNumber(nutriments, ['carbohydrates_100g', 'carbohydrates']) ?? 0,
    fat: firstNumber(nutriments, ['fat_100g', 'fat']) ?? 0,
    fiber: firstNumber(nutriments, ['fiber_100g', 'fiber']),
    sugar: firstNumber(nutriments, ['sugars_100g', 'sugars']),
    salt: firstNumber(nutriments, ['salt_100g', 'salt']),
  };
}

function mapProduct(product: JsonRecord): Food | null {
  const barcode = String(product.code ?? '').trim();
  const name = String(
    product.product_name_de || product.product_name || '',
  ).trim();
  const nutriments = (product.nutriments ?? {}) as JsonRecord;
  const per100 = readMacros(nutriments);

  if (!name || !per100) return null;

  const servingSize = toNumber(product.serving_quantity);
  const brandValue = product.brands;
  const brand = Array.isArray(brandValue)
    ? String(brandValue[0] ?? '').trim()
    : String(brandValue ?? '').split(',')[0]?.trim();
  const categoryValue = product.categories;
  const categories = (Array.isArray(categoryValue)
    ? categoryValue.map((entry) => String(entry))
    : String(categoryValue ?? '').split(',')
  )
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 4);

  return {
    id: barcode ? `off-${barcode}` : `off-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    brand: brand || undefined,
    barcode: barcode || undefined,
    imageUrl:
      typeof product.image_front_small_url === 'string'
        ? product.image_front_small_url
        : undefined,
    per100,
    servingSize: servingSize && servingSize > 0 ? servingSize : undefined,
    servingLabel:
      typeof product.serving_size === 'string' && product.serving_size.trim()
        ? product.serving_size.trim()
        : undefined,
    source: 'off',
    categories,
  };
}

async function requestJson(url: string, timeoutMs = 12000): Promise<JsonRecord> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KalorienKompass/1.0 (Expo; Kontakt: lokal)',
      },
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts antwortet mit ${response.status}.`);
    }

    return (await response.json()) as JsonRecord;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProductByBarcode(barcode: string): Promise<Food | null> {
  const clean = barcode.replace(/\D/g, '');
  if (clean.length < 8) {
    throw new Error('Bitte einen gültigen Barcode mit mindestens 8 Ziffern eingeben.');
  }

  const data = await requestJson(
    `${API_BASE}/api/v2/product/${encodeURIComponent(clean)}.json?fields=${FIELDS}`,
  );

  if (toNumber(data.status) === 0) return null;
  const product = data.product as JsonRecord | undefined;
  if (!product) return null;

  return mapProduct(product);
}

export async function searchOpenFoodFacts(query: string): Promise<Food[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const params = `q=${encodeURIComponent(term)}&page_size=20&langs=de`;

  const data = await requestJson(
    `https://search.openfoodfacts.org/search?${params}`,
  );
  const products = Array.isArray(data.hits)
    ? (data.hits as JsonRecord[])
    : [];

  return products
    .map(mapProduct)
    .filter((food): food is Food => food !== null);
}
