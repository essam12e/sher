const test = require("node:test");
const assert = require("node:assert/strict");
const { imageQualityScore, productMatchScore, resolutionScore } = require("@/lib/matching");
const { normalizeText, tokenize } = require("@/lib/query");

export {};

test("query normalization removes punctuation and normalizes spacing", () => {
  assert.equal(normalizeText(" Samsung   Galaxy-A56 5G!! "), "samsung galaxy a56 5g");
  assert.deepEqual(tokenize("The Anker PowerCore 10000"), ["anker", "powercore", "10000"]);
});

test("product matching penalizes nearby model conflicts", () => {
  const product = { name: "Samsung Galaxy A56 5G", brand: "Samsung", model: "A56" };
  const exact = productMatchScore(product, "Samsung Galaxy A56 5G product image");
  const wrong = productMatchScore(product, "Samsung Galaxy A55 5G product image");
  assert.ok(exact > 80);
  assert.ok(wrong < exact);
});

test("resolution and quality scores prefer ecommerce-ready images", () => {
  assert.equal(resolutionScore(1200, 1200), 100);
  assert.ok(resolutionScore(400, 400) < 50);
  assert.ok(
    imageQualityScore({
      matchScore: 95,
      width: 1000,
      height: 1000,
      watermarkStatus: "No Watermark Detected",
      mimeType: "image/jpeg",
    }) > 80,
  );
});

test("a result for a different product does not get a high match score", () => {
  const product = { name: "Anker PowerCore 10000", brand: "Anker" };
  const other = productMatchScore(product, "Xiaomi Mi Power Bank 3 20000mAh xiaomi.com");
  const same = productMatchScore(product, "Anker PowerCore 10000 Portable Charger anker.com");
  assert.ok(other < 20);
  assert.ok(same >= 60);
});
