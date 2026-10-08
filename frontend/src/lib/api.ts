"use client";
import { useEffect, useState } from "react";

export type Tier = "peak" | "normal" | "offpeak";
export type Charger = { n: number; state: "available" | "charging" | "offline"; soc?: number; kw?: number };
export type Hub = { id: string; place: string; fa: string; en: string; total: number; kw: number; live: boolean; chargers: Charger[]; available: number; charging: number };
export type Place = { id: string; fa: string; en: string; lat: number; lng: number };
export type Network = {
  now: string;
  price: { tier: Tier; toman_per_kwh: number };
  places: Place[];
  hubs: Hub[];
  stats: { hubs: number; chargers: number; available: number; charging: number; power_kw: number; kwh_today: number; sessions_today: number; co2_kg_today: number };
};
export type Month = { m: number; revenue: number; cogs: number; gross: number; opex: number; net: number; cash: number };
export type Financials = {
  funding: { equity: number; loan: number; total: number };
  setup: { group: "company" | "site" | "equipment" | "launch"; fa: string; en: string; amount: number }[];
  months: Month[];
  totals: { revenue: number; gross: number; net: number; gross_margin: number; breakeven_month: number; min_cash: number; end_cash: number };
};

export class ApiError extends Error {
  constructor(public status: number, public detail?: unknown) {
    super(`api ${status}`);
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`/api/${path}`, {
    cache: "no-store",
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, data?.detail);
  return data as T;
}

/** Fetch now and every `ms` while the tab is visible. While the API is failing, back off up to 60 s so an outage isn't hammered by every open tab. */
export function usePoll<T>(path: string, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true, busy = false, timer = 0, delay = ms;
    const load = async () => {
      if (busy || document.visibilityState !== "visible") return; // hidden tabs stop; visibilitychange resumes
      busy = true;
      clearTimeout(timer);
      try {
        const d = await api<T>(path);
        if (alive) (setData(d), setError(false), (delay = ms));
      } catch {
        if (alive) (setError(true), (delay = Math.min(delay * 2, 60_000)));
      }
      busy = false;
      if (alive) timer = window.setTimeout(load, delay);
    };
    load();
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [path, ms]);
  return { data, error };
}
