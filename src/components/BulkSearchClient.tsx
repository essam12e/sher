"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { ProductSearchClient } from "@/components/ProductSearchClient";

export function BulkSearchClient() {
  const [text, setText] = useState("AUKEY Circlet Blink 60W\nAnker PowerCore 10000\nSamsung Galaxy A56\nBaseus 65W Charger");
  const [selected, setSelected] = useState<string | null>(null);
  const products = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">قائمة المنتجات</span>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={10} className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-emerald-600" />
        </label>
        <div className="mt-4 space-y-2">
          {products.map((product) => (
            <button
              key={product}
              onClick={() => setSelected(product)}
              className="flex w-full items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-right text-sm font-bold hover:bg-slate-50"
            >
              <Search className="h-4 w-4" />
              {product}
            </button>
          ))}
        </div>
      </section>
      <section>
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 font-extrabold text-emerald-800">البحث الحالي: {selected}</div>
            <ProductSearchClient key={selected} initialName={selected} />
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center font-bold text-slate-600">اختر منتجًا من القائمة لبدء البحث.</div>
        )}
      </section>
    </div>
  );
}
