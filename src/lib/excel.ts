import ExcelJS from "exceljs";

export type CellPrimitive = string | number | boolean | null;

export type ExcelPreview = {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: Record<string, CellPrimitive>[];
  totalRows: number;
  suggestedMapping: Partial<ColumnMapping>;
};

export type ColumnMapping = {
  productNameColumn: string;
  skuColumn?: string;
  productIdColumn?: string;
  imageUrlColumn: string;
};

export type ExcelImageUpdate = {
  sku?: string;
  productId?: string;
  productName?: string;
  hostedUrl: string;
};

export const MAX_EXCEL_BYTES = 10 * 1024 * 1024;

/**
 * يحوّل أي قيمة خلية من ExcelJS إلى قيمة بسيطة.
 * الخلايا قد تكون نصًا منسقًا (richText) أو رابطًا (hyperlink) أو معادلة (formula)
 * وكانت تظهر سابقًا كـ "[object Object]".
 */
export function cellToPrimitive(value: unknown): CellPrimitive {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.richText)) {
      return (obj.richText as { text?: string }[]).map((part) => part.text ?? "").join("");
    }
    if (typeof obj.text === "string") return obj.text;
    if (obj.hyperlink && typeof obj.hyperlink === "string") return obj.hyperlink;
    if ("result" in obj) return cellToPrimitive(obj.result);
    if ("error" in obj) return null;
  }
  return String(value);
}

function rowValues(row: ExcelJS.Row, columnCount: number) {
  const values: CellPrimitive[] = [];
  for (let col = 1; col <= columnCount; col += 1) {
    values.push(cellToPrimitive(row.getCell(col).value));
  }
  return values;
}

/** نفس منطق العناوين يُستخدم في المعاينة والتصدير حتى تتطابق أسماء الأعمدة دائمًا. */
export function sheetHeaders(sheet: ExcelJS.Worksheet) {
  const columnCount = Math.max(sheet.getRow(1).cellCount, sheet.columnCount);
  const raw = rowValues(sheet.getRow(1), columnCount);
  const seen = new Map<string, number>();
  return raw.map((value, index) => {
    const base = String(value ?? "").trim() || `Column ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

/** يجرب الأنماط بالترتيب (الأدق أولًا) ويتجاهل الأعمدة المستبعدة. */
function guessColumn(headers: string[], patterns: RegExp[], exclude?: RegExp) {
  for (const pattern of patterns) {
    const found = headers.find((header) => pattern.test(header) && !exclude?.test(header));
    if (found) return found;
  }
  return undefined;
}

export function suggestMapping(headers: string[]): Partial<ColumnMapping> {
  const idLike = /(^|\s)(id|sku)(\s|$)|رقم|معرف|رمز|كود|باركود|سعر|كمية|رابط|صورة|image|url/i;
  return {
    productNameColumn: guessColumn(
      headers,
      [/product.?name/i, /^name$/i, /اسم\s*المنتج/, /^الاسم$/, /اسم/, /^title$/i, /title/i, /المنتج/],
      idLike,
    ),
    skuColumn: guessColumn(headers, [/^sku$/i, /sku/i, /رمز\s*المنتج/, /الرمز/, /barcode|باركود/i]),
    productIdColumn: guessColumn(headers, [/product.?id/i, /^id$/i, /رقم\s*المنتج/, /معرف/]),
    imageUrlColumn: guessColumn(headers, [/image.?url/i, /رابط\s*الصورة/, /image/i, /صورة|الصور/, /photo|picture/i]),
  };
}

async function loadWorkbook(buffer: Buffer) {
  if (buffer.length > MAX_EXCEL_BYTES) throw new Error("حجم ملف Excel أكبر من 10MB.");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as never);
  } catch {
    throw new Error("تعذر قراءة الملف. تأكد أنه ملف Excel بصيغة xlsx.");
  }
  return workbook;
}

function pickSheet(workbook: ExcelJS.Workbook, sheetName?: string) {
  const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  if (!sheet) throw new Error(sheetName ? "ورقة Excel المحددة غير موجودة." : "ملف Excel لا يحتوي على أوراق.");
  return sheet;
}

export async function previewWorkbook(buffer: Buffer, sheetName?: string): Promise<ExcelPreview> {
  const workbook = await loadWorkbook(buffer);
  const sheet = pickSheet(workbook, sheetName);

  const headers = sheetHeaders(sheet);
  const rows: Record<string, CellPrimitive>[] = [];
  const maxRow = Math.min(sheet.rowCount, 26);
  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber += 1) {
    const values = rowValues(sheet.getRow(rowNumber), headers.length);
    const record: Record<string, CellPrimitive> = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    rows.push(record);
  }

  return {
    sheetNames: workbook.worksheets.map((item) => item.name),
    activeSheet: sheet.name,
    headers,
    rows,
    totalRows: Math.max(0, sheet.rowCount - 1),
    suggestedMapping: suggestMapping(headers),
  };
}

function normalizeKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * يصدّر نسخة جديدة من الملف بعد تعبئة عمود رابط الصورة فقط.
 * الدالة لا تعتمد على ذاكرة الخادم: الملف يُرسل مع طلب التصدير،
 * لأن الخوادم في Vercel لا تشارك الذاكرة بين الطلبات.
 */
export async function exportWorkbookWithImageUrls(input: {
  buffer: Buffer;
  sheetName?: string;
  mapping: ColumnMapping;
  updates: ExcelImageUpdate[];
  overwriteExisting?: boolean;
}) {
  const workbook = await loadWorkbook(input.buffer);
  const sheet = pickSheet(workbook, input.sheetName);

  const headers = sheetHeaders(sheet);
  const imageCol = headers.indexOf(input.mapping.imageUrlColumn);
  if (imageCol < 0) throw new Error("عمود رابط الصورة المحدد غير موجود.");

  const skuCol = input.mapping.skuColumn ? headers.indexOf(input.mapping.skuColumn) : -1;
  const productIdCol = input.mapping.productIdColumn ? headers.indexOf(input.mapping.productIdColumn) : -1;
  const productNameCol = headers.indexOf(input.mapping.productNameColumn);

  // أول قيمة لكل مفتاح هي الأحدث (القائمة مرتبة من الأحدث للأقدم).
  const toMap = (pick: (u: ExcelImageUpdate) => string | undefined) => {
    const map = new Map<string, string>();
    for (const update of input.updates) {
      const key = normalizeKey(pick(update));
      if (key && !map.has(key)) map.set(key, update.hostedUrl);
    }
    return map;
  };
  const bySku = toMap((u) => u.sku);
  const byProductId = toMap((u) => u.productId);
  const byName = toMap((u) => u.productName);

  const overwrite = input.overwriteExisting ?? true;
  let changedRows = 0;
  let unmatchedRows = 0;
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const excelRow = sheet.getRow(rowIndex);
    const row = rowValues(excelRow, headers.length);
    if (row.every((value) => value === null || value === "")) continue;

    let url: string | undefined;
    if (skuCol >= 0) url = bySku.get(normalizeKey(row[skuCol]));
    if (!url && productIdCol >= 0) url = byProductId.get(normalizeKey(row[productIdCol]));
    if (!url && productNameCol >= 0) url = byName.get(normalizeKey(row[productNameCol]));

    if (!url) {
      unmatchedRows += 1;
      continue;
    }

    const cell = excelRow.getCell(imageCol + 1);
    const current = cellToPrimitive(cell.value);
    if (!overwrite && current !== null && String(current).trim() !== "") continue;

    cell.value = url;
    changedRows += 1;
  }

  const output = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(output), changedRows, unmatchedRows };
}
