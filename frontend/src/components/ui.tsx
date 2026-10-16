"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n/use";

export const spring = { type: "spring", visualDuration: 0.4, bounce: 0 } as const;

export function Mark({ className = "size-8" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00e0ff" />
          <stop offset=".55" stopColor="#3dffa8" />
          <stop offset="1" stopColor="#c6ff3d" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#030507" />
      <path d="M36 8 16 36h14l-4 20 22-30H34l2-18Z" fill={`url(#${id})`} />
    </svg>
  );
}

export function Logo() {
  const { locale, t } = useI18n();
  return (
    <Link href={`/${locale}`} className="press flex min-h-11 shrink-0 items-center gap-2 rounded-full pe-2 text-[17px] font-bold tight-sm" aria-label={`${t.brand} — ${t.nav.home}`}>
      <Mark />
      <span>{t.brand}</span>
    </Link>
  );
}

export const iconBtn = "press grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-fg dark:hover:bg-white/10";

type Theme = "light" | "dark" | "system";
const order: Theme[] = ["light", "dark", "system"];
const prefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => setTheme((document.documentElement.dataset.theme as Theme) || "system"), []);
  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => document.documentElement.classList.toggle("dark", mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);

  const cycle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = order[(order.indexOf(theme) + 1) % order.length];
    const el = document.documentElement;
    const dark = next === "dark" || (next === "system" && prefersDark());
    const apply = () => {
      el.classList.toggle("dark", dark);
      el.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {}
      flushSync(() => setTheme(next));
    };
    if (!document.startViewTransition || dark === el.classList.contains("dark") || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.detail ? e.clientX : r.left + r.width / 2;
    const y = e.detail ? e.clientY : r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    el.classList.add("vt-theme");
    const vt = document.startViewTransition(apply);
    vt.ready.then(() =>
      el.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(0.23, 1, 0.32, 1)", pseudoElement: "::view-transition-new(root)" },
      ),
    );
    vt.finished.finally(() => el.classList.remove("vt-theme"));
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button type="button" onClick={cycle} className={iconBtn} aria-label={`${t.theme.label}: ${t.theme[theme]}`} title={`${t.theme.label}: ${t.theme[theme]}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={spring}
          className="grid place-items-center"
        >
          <Icon className="size-[19px]" aria-hidden />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function LangSwitch() {
  const { locale, t } = useI18n();
  const other = locale === "fa" ? "en" : "fa";
  const href = (usePathname() ?? `/${locale}`).replace(/^\/(fa|en)/, `/${other}`);
  return (
    <a
      href={href}
      hrefLang={other}
      lang={other}
      aria-label={t.lang.label}
      title={t.lang.label}
      onClick={(e) => {
        e.preventDefault();
        location.assign(href + location.search + location.hash);
      }}
      className={`${iconBtn} text-[13px] font-bold`}
    >
      {t.lang.other}
    </a>
  );
}

/** Glass card with cursor-following spotlight. */
export function Card({ className = "", children, ...rest }: ComponentProps<"div">) {
  return (
    <div
      {...rest}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={`glass spot squircle rounded-[28px] ${className}`}
    >
      {children}
    </div>
  );
}
