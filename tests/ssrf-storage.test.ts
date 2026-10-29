const test = require("node:test");
const assert = require("node:assert/strict");
const { isBlockedIp } = require("@/lib/ssrf");
const { storageKeyForImage } = require("@/lib/storage-key");

export {};

test("ssrf protection blocks local and private ranges", () => {
  assert.equal(isBlockedIp("127.0.0.1"), true);
  assert.equal(isBlockedIp("10.0.0.3"), true);
  assert.equal(isBlockedIp("192.168.1.20"), true);
  assert.equal(isBlockedIp("169.254.169.254"), true);
  assert.equal(isBlockedIp("8.8.8.8"), false);
});

test("storage key generation uses sku when present", () => {
  const key = storageKeyForImage({ name: "Samsung Galaxy A56", sku: "SAM-A56" }, "abcdef1234567890", "jpg");
  assert.equal(key, "products/sam-a56/image-abcdef123456.jpg");
});

test("ssrf protection blocks IPv4-mapped IPv6 and reserved ranges", () => {
  assert.equal(isBlockedIp("::ffff:127.0.0.1"), true);
  assert.equal(isBlockedIp("::ffff:7f00:1"), true);
  assert.equal(isBlockedIp("::ffff:a9fe:a9fe"), true);
  assert.equal(isBlockedIp("fe80::1"), true);
  assert.equal(isBlockedIp("198.18.0.1"), true);
  assert.equal(isBlockedIp("::ffff:8.8.8.8"), false);
  assert.equal(isBlockedIp("2606:4700::1111"), false);
});
