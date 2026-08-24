const test = require("node:test");
const assert = require("node:assert/strict");
const { inspectImageBuffer, sha256, validateMinimumDimensions } = require("@/lib/image/validation");

export {};

test("minimum dimensions reject small images", () => {
  assert.throws(() => validateMinimumDimensions(499, 600, 500, 500), /أقل من الحد/);
  assert.doesNotThrow(() => validateMinimumDimensions(500, 500, 500, 500));
});

test("mime validation checks real image bytes", async (t: import("node:test").TestContext) => {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    t.skip("Sharp native module is blocked by local Windows Application Control.");
    return;
  }

  const jpeg = await sharp({ create: { width: 600, height: 600, channels: 3, background: "white" } }).jpeg().toBuffer();
  const metadata = await inspectImageBuffer(jpeg);
  assert.equal(metadata.mimeType, "image/jpeg");
  assert.equal(metadata.width, 600);
  await assert.rejects(() => inspectImageBuffer(Buffer.from("<html>not an image</html>")), /غير مدعوم|صورة/);
});

test("sha256 duplicate detection hash is stable", () => {
  const first = sha256(Buffer.from("same-image"));
  const second = sha256(Buffer.from("same-image"));
  assert.equal(first, second);
  assert.equal(first.length, 64);
});
