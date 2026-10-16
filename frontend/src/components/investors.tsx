"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/use";
import { api, type Financials, type Month } from "@/lib/api";
import { num, pct } from "@/lib/format";
import { Card } from "./ui";
import { Reveal } from "./sections";

const W = 640, H = 240, L = 40, R = 8, T = 12, B = 28;

function useScale(vals: number[]) {
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const y = (v: number) => T + ((max - v) / (max - min || 1)) * (H - T - B);
  const raw = (max - min) / 4, mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((x) => x >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
  return { y, ticks };
}

function Axes({ ticks, y, months }: { ticks: number[]; y: (v: number) => number; months: Month[] }) {
  const { locale } = useI18n();
  const bw = (W - L - R) / months.length;
  return (
    <>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--faint)">
            {num(v, locale)}
          </text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
      {months.map((m, i) => (
        <text key={m.m} x={L + bw * (i + 0.5)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--faint)">
          {num(m.m, locale)}
        </text>
      ))}
    </>
  );
}

function PLChart({ months }: { months: Month[] }) {
  const { locale, t } = useI18n();
  const { y, ticks } = useScale(months.flatMap((m) => [m.revenue, m.net]));
  const bw = (W - L - R) / months.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t.inv.pl}>
      <Axes ticks={ticks} y={y} months={months} />
      {months.map((m, i) => {
        const x = L + bw * i + bw * 0.14;
        const w = bw * 0.34;
        return (
          <g key={m.m}>
            <title>{`${fill(t.inv.month, { n: num(m.m, locale) })} · ${t.inv.revenueL}: ${num(m.revenue, locale)} · ${t.inv.netL}: ${num(m.net, locale, 1)}`}</title>
            <rect x={x} y={y(m.revenue)} width={w} height={y(0) - y(m.revenue)} rx="3" fill="var(--c2)" opacity=".85" />
            <rect x={x + w + 2} y={Math.min(y(0), y(m.net))} width={w} height={Math.abs(y(m.net) - y(0))} rx="3" fill={m.net >= 0 ? "var(--pos)" : "var(--neg)"} />
          </g>
        );
      })}
    </svg>
  );
}

function CashChart({ months }: { months: Month[] }) {
  const { locale, t } = useI18n();
  const { y, ticks } = useScale(months.map((m) => m.cash));
  const bw = (W - L - R) / months.length;
  const pts = months.map((m, i) => [L + bw * (i + 0.5), y(m.cash)] as const);
  const d = pts.map(([x, py], i) => `${i ? "L" : "M"}${x},${py}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t.inv.cash}>
      <defs>
        <linearGradient id="cash-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".3" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Axes ticks={ticks} y={y} months={months} />
      <path d={`${d}L${pts[pts.length - 1][0]},${y(0)}L${pts[0][0]},${y(0)}Z`} fill="url(#cash-fill)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {months.map((m, i) => (
        <circle key={m.m} cx={pts[i][0]} cy={pts[i][1]} r="4" fill={m.cash < 0 ? "var(--neg)" : "var(--accent)"} stroke="var(--card-solid)" strokeWidth="2">
          <title>{`${fill(t.inv.month, { n: num(m.m, locale) })}: ${num(m.cash, locale, 1)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
      {items.map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

const GROUP_COLORS = { company: "var(--c5)", site: "var(--c4)", equipment: "var(--c2)", launch: "var(--c1)" } as const;

export function Investors({ footer }: { footer: ReactNode }) {
  const { locale, t } = useI18n();
  const [f, setF] = useState<Financials | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => void api<Financials>("financials").then(setF, () => setErr(true)), []);
  const u = t.inv.unit;
  const Back = locale === "fa" ? ArrowRight : ArrowLeft;

  const groups = f && (Object.keys(GROUP_COLORS) as (keyof typeof GROUP_COLORS)[]).map((g) => ({ g, items: f.setup.filter((s) => s.group === g), sum: f.setup.filter((s) => s.group === g).reduce((a, s) => a + s.amount, 0) }));
  const setupSum = groups?.reduce((a, g) => a + g.sum, 0) ?? 0;

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-10 md:pb-16">
        <Link href={`/${locale}`} className="press inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-fg">
          <Back className="size-4" aria-hidden />
          {t.inv.back}
        </Link>
        <Reveal className="mb-10 mt-4">
          <h1 className="display tight text-4xl font-extrabold sm:text-6xl">
            <span className="grad-text">{t.inv.title}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">{t.inv.sub}</p>
        </Reveal>

        {err && <p className="text-neg">{t.inv.error}</p>}
        {!f && !err && <div className="skeleton h-96 rounded-[28px]" />}
        {f && groups && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                [t.inv.capex, num(f.funding.total, locale), u],
                [t.inv.revenue, num(f.totals.revenue, locale), u],
                [t.inv.margin, pct(f.totals.gross_margin, locale), ""],
                [t.inv.breakeven, fill(t.inv.month, { n: num(f.totals.breakeven_month, locale) }), ""],
                [t.inv.endCash, num(f.totals.end_cash, locale, 1), u],
              ].map(([k, v, unit], i) => (
                <Reveal key={k} className={i === 0 ? "col-span-2 md:col-span-1" : ""}>
                  <Card className="h-full p-5">
                    <div className="text-xs font-medium text-muted">{k}</div>
                    <div className="num tight mt-1 text-3xl font-bold">{v}</div>
                    {unit && <div className="text-[11px] text-faint">{unit}</div>}
                  </Card>
                </Reveal>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Reveal>
                <Card className="h-full p-6" dir="ltr">
                  <h2 className="tight-sm text-lg font-semibold" dir="auto">{t.inv.pl}</h2>
                  <p className="text-xs text-faint" dir="auto">{u}</p>
                  <PLChart months={f.months} />
                  <Legend items={[["var(--c2)", t.inv.revenueL], ["var(--pos)", t.inv.netL], ["var(--neg)", t.inv.netL + " (−)"]]} />
                </Card>
              </Reveal>
              <Reveal>
                <Card className="h-full p-6" dir="ltr">
                  <h2 className="tight-sm text-lg font-semibold" dir="auto">{t.inv.cash}</h2>
                  <p className="text-xs text-faint" dir="auto">
                    {t.inv.minCash}: <span className="num font-semibold text-neg">{num(f.totals.min_cash, locale, 1)}</span> {u}
                  </p>
                  <CashChart months={f.months} />
                  <p className="mt-3 text-xs text-muted" dir="auto">{t.inv.cashNote}</p>
                </Card>
              </Reveal>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
              <Reveal>
                <Card className="h-full p-6">
                  <h2 className="tight-sm text-lg font-semibold">{t.inv.funding}</h2>
                  <div className="num tight mt-3 text-4xl font-bold">
                    {num(f.funding.total, locale)} <span className="text-base font-medium text-muted">{u}</span>
                  </div>
                  <div className="mt-5 flex h-4 overflow-hidden rounded-full">
                    <div className="bg-accent" style={{ width: `${(f.funding.equity / f.funding.total) * 100}%` }} />
                    <div className="bg-c2" style={{ flex: 1 }} />
                  </div>
                  <dl className="mt-5 grid gap-3 text-sm">
                    {[
                      ["bg-accent", t.inv.equity, f.funding.equity],
                      ["bg-c2", t.inv.loan, f.funding.loan],
                    ].map(([c, l, v]) => (
                      <div key={l} className="flex items-center justify-between">
                        <dt className="flex items-center gap-2 text-muted">
                          <span className={`size-2.5 rounded-sm ${c}`} />
                          {l}
                        </dt>
                        <dd className="num font-semibold">
                          {num(+v, locale)} · {pct(+v / f.funding.total, locale)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </Reveal>
              <Reveal>
                <Card className="h-full p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="tight-sm text-lg font-semibold">{t.inv.setup}</h2>
                    <span className="num text-sm text-muted">
                      {t.inv.setupTotal}: {num(setupSum, locale, 1)} {u}
                    </span>
                  </div>
                  <div className="mt-4 flex h-4 overflow-hidden rounded-full">
                    {groups.map((g) => (
                      <div key={g.g} title={t.inv.groups[g.g]} style={{ width: `${(g.sum / setupSum) * 100}%`, background: GROUP_COLORS[g.g] }} />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {groups.map((g) => (
                      <details key={g.g} className="faq rounded-2xl bg-black/[0.03] px-4 dark:bg-white/[0.04]">
                        <summary className="flex min-h-12 items-center gap-3 text-sm font-medium">
                          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: GROUP_COLORS[g.g] }} />
                          <span className="flex-1">{t.inv.groups[g.g]}</span>
                          <span className="num font-semibold">{num(g.sum, locale, 1)}</span>
                          <Plus className="chev size-4 text-muted" aria-hidden />
                        </summary>
                        <ul className="grid gap-1.5 pb-3 text-sm text-muted">
                          {g.items.map((s) => (
                            <li key={s.en} className="flex justify-between gap-3">
                              <span>{locale === "fa" ? s.fa : s.en}</span>
                              <span className="num">{num(s.amount, locale, 1)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                </Card>
              </Reveal>
            </div>

            <Reveal>
              <Card className="p-6">
                <h2 className="tight-sm text-lg font-semibold">{t.inv.milestones}</h2>
                <ol className="relative mt-6 grid gap-5 border-s-2 border-line ps-6">
                  {t.inv.ms.map((m) => (
                    <li key={m.m} className="relative">
                      <span className="absolute -start-[31px] top-1.5 size-3 rounded-full bg-accent ring-4 ring-[var(--card-solid)]" />
                      <div className="text-xs font-semibold text-accent">{fill(t.inv.month, { n: num(m.m, locale) })}</div>
                      <div className="mt-0.5">{m.t}</div>
                    </li>
                  ))}
                </ol>
              </Card>
            </Reveal>
          </div>
        )}
        {footer}
      </main>
    </>
  );
}
