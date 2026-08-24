import ExcelJS from "exceljs";

export type ExcelPreview = {
  workbookId: string;
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: Record<string, string | number | boolean | null>[];
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

const workbooks = new Map<string, Buffer>();

function cellValue(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function rowValues(row: ExcelJS.Row) {
  const values = Array.isArray(row.values) ? row.values.slice(1) : [];
  return values;
}

export async function previewWorkbook(buffer: Buffer): Promise<ExcelPreview> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("ملف Excel لا يحتوي على أوراق.");

  const headers = rowValues(sheet.getRow(1)).map((header, index) => String(header || `Column ${index + 1}`));
  const rows: Record<string, string | number | boolean | null>[] = [];
  const maxRow = Math.min(sheet.rowCount, 26);
  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber += 1) {
    const values = rowValues(sheet.getRow(rowNumber));
    const record: Record<string, string | number | boolean | null> = {};
    headers.forEach((header, index) => {
      record[header] = cellValue(values[index]);
    });
    rows.push(record);
  }

  const workbookId = crypto.randomUUID();
  workbooks.set(workbookId, buffer);

  return { workbookId, sheetNames: workbook.worksheets.map((item) => item.name), activeSheet: sheet.name, headers, rows };
}

function normalizeKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function exportWorkbookWithImageUrls(input: {
  workbookId: string;
  sheetName: string;
  mapping: ColumnMapping;
  updates: ExcelImageUpdate[];
}) {
  const original = workbooks.get(input.workbookId);
  if (!original) throw new Error("انتهت جلسة ملف Excel. ارفع الملف مرة أخرى.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(original as never);
  const sheet = workbook.getWorksheet(input.sheetName);
  if (!sheet) throw new Error("ورقة Excel المحددة غير موجودة.");

  const headers = rowValues(sheet.getRow(1)).map(String);
  const imageCol = headers.indexOf(input.mapping.imageUrlColumn);
  if (imageCol < 0) throw new Error("عمود رابط الصورة المحدد غير موجود.");

  const skuCol = input.mapping.skuColumn ? headers.indexOf(input.mapping.skuColumn) : -1;
  const productIdCol = input.mapping.productIdColumn ? headers.indexOf(input.mapping.productIdColumn) : -1;
  const productNameCol = headers.indexOf(input.mapping.productNameColumn);

  const bySku = new Map(input.updates.filter((u) => u.sku).map((u) => [normalizeKey(u.sku), u.hostedUrl]));
  const byProductId = new Map(input.updates.filter((u) => u.productId).map((u) => [normalizeKey(u.productId), u.hostedUrl]));
  const byName = new Map(input.updates.filter((u) => u.productName).map((u) => [normalizeKey(u.productName), u.hostedUrl]));

  let changedRows = 0;
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = rowValues(sheet.getRow(rowIndex));
    let url: string | undefined;

    if (skuCol >= 0) url = bySku.get(normalizeKey(row[skuCol]));
    if (!url && productIdCol >= 0) url = byProductId.get(normalizeKey(row[productIdCol]));
    if (!url && productNameCol >= 0) url = byName.get(normalizeKey(row[productNameCol]));

    if (url) {
      sheet.getRow(rowIndex).getCell(imageCol + 1).value = url;
      changedRows += 1;
    }
  }

  const output = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(output), changedRows };
}
