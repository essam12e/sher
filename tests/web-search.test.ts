const test = require("node:test");
const assert = require("node:assert/strict");
const { parseBingImagesHtml, parseDuckDuckGoJson } = require("@/lib/search/web");
const { extractOgImage, unwrapImageUrl } = require("@/lib/http");

export {};

const m = JSON.stringify({
  purl: "https://www.amazon.com/Anker-PowerCore/dp/B07PXMF52C",
  murl: "https://m.media-amazon.com/images/I/6142te88vDL._AC_.jpg",
  turl: "https://ts3.explicit.bing.net/th?id=OIP.abc&pid=15.1",
  t: "Amazon.com: Anker PowerCore 10000 &amp; more",
}).replace(/"/g, "&quot;");

const bingHtml = `<ul><li><div class="imgpt"><a aria-label="Image result" role="link" class="iusc" style="height:180px" m="${m}" href="/images/search?view=detailV2&amp;mediaurl=https%3a%2f%2fm.media-amazon.com%2fimages%2fI%2f6142te88vDL._AC_.jpg&amp;cdnurl=https%3a%2f%2fth.bing.com%2fth%2fid%2fR.e89f%3frik%3dqA%26pid%3dImgRaw%26r%3d0&amp;exph=839&amp;expw=1083&amp;q=anker"><img/></a><div class="img_info"><span class="nowrap">1083&#215;839</span></div></div></li>
<li><a class="iusc" m="{&quot;murl&quot;:&quot;javascript:alert(1)&quot;}" href="/x"></a></li></ul>`;

test("bing image page parser extracts original, page, thumbnail, cached copy and size", () => {
  const results = parseBingImagesHtml(bingHtml);
  assert.equal(results.length, 1);
  const [first] = results;
  assert.equal(first.originalUrl, "https://m.media-amazon.com/images/I/6142te88vDL._AC_.jpg");
  assert.equal(first.pageUrl, "https://www.amazon.com/Anker-PowerCore/dp/B07PXMF52C");
  assert.equal(first.source, "amazon.com");
  assert.equal(first.fallbackUrl, "https://th.bing.com/th/id/R.e89f?rik=qA&pid=ImgRaw&r=0");
  assert.equal(first.width, 1083);
  assert.equal(first.height, 839);
  assert.equal(first.title, "Amazon.com: Anker PowerCore 10000 & more");
});

test("duckduckgo parser keeps only http images", () => {
  const results = parseDuckDuckGoJson(
    JSON.stringify({
      results: [
        { title: "Phone", image: "https://cdn.x.com/a.jpg", thumbnail: "https://t.x/a", url: "https://shop.x.com/p", width: 800, height: 800 },
        { title: "bad", image: "data:image/png;base64,AAA" },
      ],
    }),
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].source, "shop.x.com");
  assert.equal(results[0].width, 800);
});

test("pasted google/bing result links are unwrapped to the real image", () => {
  assert.equal(
    unwrapImageUrl("https://www.google.com/imgres?imgurl=https%3A%2F%2Fcdn.x.com%2Fa.jpg&imgrefurl=https%3A%2F%2Fx.com"),
    "https://cdn.x.com/a.jpg",
  );
  assert.equal(unwrapImageUrl("https://www.bing.com/images/search?mediaurl=https%3a%2f%2fcdn.x.com%2fb.png"), "https://cdn.x.com/b.png");
  assert.equal(unwrapImageUrl(" https://cdn.x.com/c.jpg "), "https://cdn.x.com/c.jpg");
});

test("product page links resolve to their og:image", () => {
  const html = '<head><meta property="og:image" content="/media/p1.jpg?w=1200&amp;h=1200"></head>';
  assert.equal(extractOgImage(html, "https://shop.example.com/p/1"), "https://shop.example.com/media/p1.jpg?w=1200&h=1200");
  assert.equal(extractOgImage("<html></html>", "https://x.com"), null);
});
