const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const { exportWorkbookWithImageUrls, previewWorkbook } = require("@/lib/excel");

export {};

test("excel row mapping updates only matching SKU image cell", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.addRows([
    ["SKU", "Product Name", "Image"],
    ["A-1", "Phone", ""],
    ["A-2", "Cable", ""],
  ]);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const preview = await previewWorkbook(buffer);
  const exported = await exportWorkbookWithImageUrls({
    workbookId: preview.workbookId,
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
});
