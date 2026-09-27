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

/** Fetch now and every `ms` while the tab is visible. */
export function usePoll<T>(path: string, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api<T>(path).then(
        (d) => alive && (setData(d), setError(false)),
        () => alive && setError(true),
      );
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), ms);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [path, ms]);
  return { data, error };
}
