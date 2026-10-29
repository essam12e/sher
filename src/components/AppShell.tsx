import { AppNav } from "@/components/AppNav";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <WhatsAppButton />
      <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-8 lg:pr-72">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="py-5 sm:py-7">
            <h1 className="text-xl font-extrabold text-slate-950 sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
