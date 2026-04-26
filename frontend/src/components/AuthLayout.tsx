import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <header className="mb-10">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            <span className="inline-block h-1 w-6 bg-neutral-900" aria-hidden />
            BIS3 Defense
          </div>
          <h1 className="mt-5 font-serif text-3xl font-medium tracking-tight text-neutral-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{subtitle}</p>
          )}
        </header>
        <main>{children}</main>
        {footer && (
          <footer className="mt-10 border-t border-neutral-200 pt-6 text-sm text-neutral-600">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export const inputClass =
  'block w-full rounded-none border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900';

export const labelClass =
  'mb-1.5 block font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500';

export const buttonPrimary =
  'inline-flex w-full items-center justify-center rounded-none bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-400';

export const buttonSecondary =
  'inline-flex w-full items-center justify-center rounded-none border border-neutral-900 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const errorBlock =
  'mb-4 border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-900';
