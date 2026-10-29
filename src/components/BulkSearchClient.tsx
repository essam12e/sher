"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Search } from "lucide-react";
import { ProductSearchClient } from "@/components/ProductSearchClient";

export function BulkSearchClient() {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLElement>(null);

  // إزالة الأسطر الفارغة والمكررة
  const products = useMemo(
    () => Array.from(new Set(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))).slice(0, 200),
    [text],
  );

  const selectedIndex = selected ? products.indexOf(selected) : -1;
  const nextProduct = selectedIndex >= 0 ? products[selectedIndex + 1] : undefined;

  function choose(product: string) {
    setSelected(product);
    setVisited((prev) => new Set(prev).add(product));
  }

  useEffect(() => {
    if (selected) searchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,320px)_1fr] lg:items-start">
      <section className="card lg:sticky lg:top-6">
        <label className="block">
          <span className="field-label">قائمة المنتجات (منتج في كل سطر)</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            placeholder={"Anker PowerCore 10000\nSamsung Galaxy A56\nBaseus 65W Charger"}
            className="field min-h-36 leading-7"
          />
        </label>
        {products.length ? (
          <>
            <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>{products.length} منتج</span>
              <span>
                تم فتح {Array.from(visited).filter((item) => products.includes(item)).length} من {products.length}
              </span>
            </div>
            <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto lg:max-h-[50vh]">
              {products.map((product) => {
                const active = product === selected;
                const done = visited.has(product);
                return (
                  <button
                    type="button"
                    key={product}
                    onClick={() => choose(product)}
                    className={[
                      "flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-right text-sm font-bold transition",
                      active
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{product}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="mt-3 text-xs font-bold leading-6 text-slate-500">
            الصق أسماء المنتجات من ملفك، ثم اضغط على أي منتج للبحث عن صورته واعتمادها.
          </p>
        )}
      </section>

      <section ref={searchRef} className="min-w-0 scroll-mt-20">
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
              <div className="min-w-0 text-sm font-extrabold text-emerald-800">
                المنتج الحالي: <span className="break-words">{selected}</span>
              </div>
              {nextProduct ? (
                <button type="button" onClick={() => choose(nextProduct)} className="btn-outline min-h-10 py-2">
                  المنتج التالي
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <ProductSearchClient key={selected} initialName={selected} autoSearch showModes={false} />
          </div>
        ) : (
          <div className="empty-state">اختر منتجًا من القائمة لبدء البحث.</div>
        )}
      </section>
    </div>
  );
}
