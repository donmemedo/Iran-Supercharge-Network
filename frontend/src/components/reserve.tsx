"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/use";
import { api, ApiError, type Hub } from "@/lib/api";
import { hhmm, num, toAscii } from "@/lib/format";
import { iconBtn } from "./ui";

type Slot = { at: string; left: number };
type Done = { code: string; slot: string; hold_minutes: number; toman_per_kwh: number };

/** Native <dialog> bottom sheet (centered on larger screens). Opens whenever `hub` is set. */
export function ReserveSheet({ hub, onClose }: { hub: Hub | null; onClose: () => void }) {
  const { locale, t } = useI18n();
  const r = t.reserve;
  const ref = useRef<HTMLDialogElement>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const loadSlots = (id: string) => api<Slot[]>(`hubs/${id}/slots`).then(setSlots, () => setErrors({ form: r.errors.generic }));

  useEffect(() => {
    if (!hub) return;
    setSlots(null);
    setSlot(null);
    setErrors({});
    setDone(null);
    ref.current?.showModal();
    loadSlots(hub.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hub) return;
    const d = new FormData(e.currentTarget);
    const name = String(d.get("name")).trim();
    const phone = toAscii(String(d.get("phone"))).replace(/\D/g, "");
    const err: Record<string, string> = {};
    if (!slot) err.slot = r.errors.slot;
    if (name.length < 2) err.name = r.errors.required;
    if (!phone) err.phone = r.errors.required;
    else if (!/^09\d{9}$/.test(phone)) err.phone = r.errors.phone;
    setErrors(err);
    if (Object.keys(err).length) return;
    setSending(true);
    try {
      setDone(await api<Done>("reservations", { hub_id: hub.id, slot, name, phone }));
    } catch (x) {
      if (x instanceof ApiError && x.status === 409) {
        setErrors({ slot: r.errors.full });
        setSlot(null);
        loadSlots(hub.id);
      } else setErrors({ form: r.errors.generic });
    } finally {
      setSending(false);
    }
  };

  const input = "mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-bg/60 px-4 text-base outline-none focus:border-accent aria-[invalid=true]:border-neg";
  const Err = ({ k }: { k: string }) => (errors[k] ? <p id={`rs-${k}`} className="mt-1 text-xs text-neg">{errors[k]}</p> : null);

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()} aria-labelledby="rs-title">
      <div className="glass rounded-t-[32px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[32px] sm:p-8" style={{ background: "var(--card-solid)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="rs-title" className="tight text-2xl font-bold">
              {r.title}
            </h2>
            {hub && <p className="text-sm text-muted">{locale === "fa" ? hub.fa : hub.en}</p>}
          </div>
          <button type="button" className={iconBtn} aria-label={r.close} onClick={() => ref.current?.close()}>
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {done ? (
          <div role="status" className="py-6 text-center">
            <CheckCircle2 className="mx-auto size-14 text-pos" aria-hidden />
            <p className="mt-3 text-xl font-semibold">{r.success}</p>
            <p className="mt-5 text-sm text-muted">{r.code}</p>
            <p className="num tight mt-1 text-4xl font-bold tracking-wider" dir="ltr">
              {done.code}
            </p>
            <p className="mt-2 text-lg font-medium">{hhmm(done.slot, locale)}</p>
            <p className="mx-auto mt-5 max-w-sm text-sm text-muted">{fill(r.hold, { n: num(done.hold_minutes, locale) })}</p>
            <p className="mt-1 text-sm text-muted">{fill(r.price, { p: num(done.toman_per_kwh, locale) })}</p>
            <button type="button" onClick={() => ref.current?.close()} className="press btn-primary mt-7 min-h-12 w-full rounded-full font-semibold">
              {r.close}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 grid gap-5">
            <fieldset aria-describedby="rs-slot">
              <legend className="text-sm font-medium text-muted">{r.slot}</legend>
              {slots ? (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {slots.map((s) => {
                    const on = slot === s.at;
                    return (
                      <button
                        key={s.at}
                        type="button"
                        disabled={!s.left}
                        aria-pressed={on}
                        onClick={() => setSlot(s.at)}
                        className={`press flex min-h-14 flex-col items-center justify-center rounded-2xl text-sm font-semibold ring-1 ring-inset disabled:opacity-40 ${on ? "bg-fg text-bg ring-fg" : "ring-line hover:ring-line-strong"}`}
                      >
                        <span className="num">{hhmm(s.at, locale)}</span>
                        <span className={`text-[11px] font-medium ${on ? "opacity-80" : "text-faint"}`}>{s.left ? fill(r.left, { n: num(s.left, locale) }) : r.full}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-faint">{r.loading}</p>
              )}
              <Err k="slot" />
            </fieldset>
            <label className="text-sm font-medium text-muted">
              {r.name}
              <input name="name" autoComplete="name" maxLength={60} aria-invalid={!!errors.name} aria-describedby="rs-name" className={input} />
              <Err k="name" />
            </label>
            <label className="text-sm font-medium text-muted">
              {r.phone}
              <input name="phone" autoComplete="tel" inputMode="tel" dir="ltr" placeholder={r.phoneHint} aria-invalid={!!errors.phone} aria-describedby="rs-phone" className={`${input} ${locale === "fa" ? "text-right" : ""}`} />
              <Err k="phone" />
            </label>
            <Err k="form" />
            <button disabled={sending} className="press btn-primary min-h-12 rounded-full font-semibold disabled:opacity-60">
              {sending ? r.sending : r.submit}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
