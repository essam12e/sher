const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const { exportWorkbookWithImageUrls, previewWorkbook, cellToPrimitive } = require("@/lib/excel");

export {};

async function workbookBuffer(rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.addRows(rows);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("excel row mapping updates only matching SKU image cell", async () => {
  const buffer = await workbookBuffer([
    ["SKU", "Product Name", "Image"],
    ["A-1", "Phone", ""],
    ["A-2", "Cable", ""],
  ]);
  const exported = await exportWorkbookWithImageUrls({
    buffer,
    sheetName: "Products",
    mapping: { productNameColumn: "Product Name", skuColumn: "SKU", imageUrlColumn: "Image" },
    updates: [{ sku: "A-2", hostedUrl: "https://cdn.example.com/a2.jpg" }],
  });
  const updated = new ExcelJS.Workbook();
  await updated.xlsx.load(exported.buffer);
  const updatedSheet = updated.getWorksheet("Products");
  assert.equal(updatedSheet.getRow(2).getCell(3).value ?? "", "");
  assert.equal(updatedSheet.getRow(3).getCell(3).value, "https://cdn.example.com/a2.jpg");
  assert.equal(exported.changedRows, 1);
  assert.equal(exported.unmatchedRows, 1);
});

test("excel export falls back to exact product name and can keep existing links", async () => {
  const buffer = await workbookBuffer([
    ["اسم المنتج", "رابط الصورة"],
    ["Anker PowerCore 10000", ""],
    ["Baseus Charger", "https://old.example.com/x.jpg"],
  ]);
  const exported = await exportWorkbookWithImageUrls({
    buffer,
    mapping: { productNameColumn: "اسم المنتج", imageUrlColumn: "رابط الصورة" },
    updates: [
      { productName: "anker powercore 10000", hostedUrl: "https://cdn.example.com/anker.jpg" },
      { productName: "Baseus Charger", hostedUrl: "https://cdn.example.com/baseus.jpg" },
    ],
    overwriteExisting: false,
  });
  const updated = new ExcelJS.Workbook();
  await updated.xlsx.load(exported.buffer);
  const sheet = updated.worksheets[0];
  assert.equal(sheet.getRow(2).getCell(2).value, "https://cdn.example.com/anker.jpg");
  assert.equal(sheet.getRow(3).getCell(2).value, "https://old.example.com/x.jpg");
  assert.equal(exported.changedRows, 1);
});

test("preview names empty and duplicate headers consistently and suggests mapping", async () => {
  const buffer = await workbookBuffer([
    ["Name", "", "Name", "SKU", "Image URL"],
    ["Phone", "x", "y", "S1", ""],
  ]);
  const preview = await previewWorkbook(buffer);
  assert.deepEqual(preview.headers, ["Name", "Column 2", "Name (2)", "SKU", "Image URL"]);
  assert.equal(preview.totalRows, 1);
  assert.equal(preview.suggestedMapping.skuColumn, "SKU");
  assert.equal(preview.suggestedMapping.imageUrlColumn, "Image URL");
  assert.equal(preview.suggestedMapping.productNameColumn, "Name");
});

test("rich text and formula cells are read as plain values", () => {
  assert.equal(cellToPrimitive({ richText: [{ text: "Sam" }, { text: "sung" }] }), "Samsung");
  assert.equal(cellToPrimitive({ formula: "A1", result: 42 }), 42);
  assert.equal(cellToPrimitive({ text: "link", hyperlink: "https://x.com" }), "link");
});

test("mapping suggestion prefers the product name column over product id", () => {
  const { suggestMapping } = require("@/lib/excel");
  const mapping = suggestMapping(["رقم المنتج", "اسم المنتج", "SKU", "السعر", "رابط الصورة"]);
  assert.equal(mapping.productNameColumn, "اسم المنتج");
  assert.equal(mapping.productIdColumn, "رقم المنتج");
  assert.equal(mapping.skuColumn, "SKU");
  assert.equal(mapping.imageUrlColumn, "رابط الصورة");
});
