"""Iran Supercharge Network API: hubs with simulated live charger status, reservations, fleet leads, plan financials."""

import random
import secrets
import threading
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import AwareDatetime, BaseModel, Field

app = FastAPI(title="Iran Supercharge Network API")
IRT = timezone(timedelta(hours=3, minutes=30))

# place key -> (fa, en, lat, lng)
PLACES = {
    "tehran": ("تهران", "Tehran", 35.69, 51.39),
    "karaj": ("کرج", "Karaj", 35.84, 50.94),
    "qom": ("قم", "Qom", 34.64, 50.88),
    "tq": ("آزادراه تهران–قم", "Tehran–Qom Fwy", 35.17, 51.12),
    "tn": ("آزادراه تهران–شمال", "Tehran–North Fwy", 36.05, 51.3),
    "isfahan": ("اصفهان", "Isfahan", 32.65, 51.67),
    "shiraz": ("شیراز", "Shiraz", 29.59, 52.58),
    "mashhad": ("مشهد", "Mashhad", 36.3, 59.6),
    "kish": ("کیش", "Kish", 26.53, 53.98),
    "tabriz": ("تبریز", "Tabriz", 38.08, 46.29),
    "rasht": ("رشت", "Rasht", 37.28, 49.58),
    "yazd": ("یزد", "Yazd", 31.9, 54.37),
}
# Phase 1 from the plan: 12 live hubs / 60 DC chargers; planned hubs show on the map as "coming soon".
# (id, place, fa, en, chargers, max kW, live)
HUBS = [
    ("milad", "tehran", "هاب برج میلاد", "Milad Tower Hub", 8, 180, True),
    ("iranmall", "tehran", "هاب ایران‌مال", "Iran Mall Hub", 6, 150, True),
    ("palladium", "tehran", "هاب پالادیوم", "Palladium Hub", 4, 120, True),
    ("azadi", "tehran", "هاب آزادی", "Azadi Hub", 6, 150, True),
    ("gohardasht", "karaj", "هاب گوهردشت", "Gohardasht Hub", 4, 120, True),
    ("pardisan", "qom", "هاب پردیسان", "Pardisan Hub", 4, 120, True),
    ("tq-service", "tq", "مجتمع خدماتی تهران–قم", "Tehran–Qom Service Area", 6, 180, True),
    ("tn-service", "tn", "مجتمع خدماتی تهران–شمال", "Tehran–North Service Area", 6, 180, True),
    ("citycenter", "isfahan", "هاب سیتی‌سنتر اصفهان", "Isfahan City Center Hub", 4, 150, True),
    ("chamran", "shiraz", "هاب بلوار چمران", "Chamran Blvd Hub", 4, 120, True),
    ("sajad", "mashhad", "هاب بلوار سجاد", "Sajad Blvd Hub", 4, 120, True),
    ("kish-pardis", "kish", "هاب پردیس کیش", "Kish Pardis Hub", 4, 60, True),
    ("tabriz-valiasr", "tabriz", "هاب ولیعصر تبریز", "Tabriz Valiasr Hub", 6, 150, False),
    ("rasht-golsar", "rasht", "هاب گلسار", "Golsar Hub", 4, 120, False),
    ("yazd-safaieh", "yazd", "هاب صفائیه", "Safaieh Hub", 4, 120, False),
]
HUB = {h[0]: h for h in HUBS}
OCCUPANCY = {"peak": 0.62, "normal": 0.42, "offpeak": 0.18}
CO2_KG_PER_KWH = 0.48  # avoided vs. an 8 L/100 km petrol car on Iran's grid mix

_lock = threading.Lock()
_reservations: dict[str, dict] = {}
_booked: dict[tuple[str, str], int] = {}
_leads: list[dict] = []
MAX_ROWS = 10_000  # ponytail: in-memory store, lost on restart; move to Postgres when real bookings exist


def now_irt() -> datetime:
    return datetime.now(IRT)


def tariff(now: datetime) -> tuple[str, int]:
    """Time-of-use price, toman per kWh (plan: price follows grid tariff and peak hours)."""
    if 18 <= now.hour < 23:
        return "peak", 8500
    if now.hour < 7:
        return "offpeak", 4500
    return "normal", 6500


def charger_states(hub: tuple, now: datetime) -> list[dict]:
    """Deterministic pseudo-live states: sessions reshuffle every 2 min, SoC ticks every 15 s."""
    hid, _, _, _, count, kw, live = hub
    if not live:
        return []
    tick = int(now.timestamp() // 15)
    occ = OCCUPANCY[tariff(now)[0]]
    out = []
    for n in range(1, count + 1):
        r = random.Random(f"{hid}:{n}:{tick // 8}")
        x = r.random()
        if x < 0.03:
            out.append({"n": n, "state": "offline"})
        elif x < occ + 0.03:
            soc = min(99, r.randint(12, 80) + (tick % 8) * 2)
            out.append({"n": n, "state": "charging", "soc": soc, "kw": round(kw * r.uniform(0.45, 0.95))})
        else:
            out.append({"n": n, "state": "available"})
    return out


def upcoming_slots(now: datetime, n: int = 8) -> list[datetime]:
    start = now.replace(second=0, microsecond=0) + timedelta(minutes=30 - now.minute % 30)
    return [start + timedelta(minutes=30 * i) for i in range(n)]


def slot_capacity(hid: str, slot: datetime) -> int:
    key = slot.isoformat()
    others = random.Random(f"{hid}:{key}").randint(0, HUB[hid][4] // 2)  # simulated bookings by other drivers
    return max(0, HUB[hid][4] - others - _booked.get((hid, key), 0))


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/network")
def network():
    now = now_irt()
    tier, price = tariff(now)
    hubs, available, charging, power = [], 0, 0, 0
    for h in HUBS:
        cs = charger_states(h, now)
        a = sum(c["state"] == "available" for c in cs)
        c = [x for x in cs if x["state"] == "charging"]
        available, charging, power = available + a, charging + len(c), power + sum(x["kw"] for x in c)
        hubs.append({"id": h[0], "place": h[1], "fa": h[2], "en": h[3], "total": h[4], "kw": h[5], "live": h[6], "chargers": cs, "available": a, "charging": len(c)})
    minutes = now.hour * 60 + now.minute
    kwh = round(minutes * 31.5 + now.second * 0.5)  # ~45 MWh/day at plan occupancy
    return {
        "now": now.isoformat(),
        "price": {"tier": tier, "toman_per_kwh": price},
        "places": [{"id": k, "fa": v[0], "en": v[1], "lat": v[2], "lng": v[3]} for k, v in PLACES.items()],
        "hubs": hubs,
        "stats": {
            "hubs": sum(h[6] for h in HUBS),
            "chargers": sum(h[4] for h in HUBS if h[6]),
            "available": available,
            "charging": charging,
            "power_kw": power,
            "kwh_today": kwh,
            "sessions_today": kwh // 38,
            "co2_kg_today": round(kwh * CO2_KG_PER_KWH),
        },
    }


@app.get("/api/hubs/{hid}/slots")
def slots(hid: str):
    if hid not in HUB or not HUB[hid][6]:
        raise HTTPException(404, "hub_not_found")
    with _lock:
        return [{"at": s.isoformat(), "left": slot_capacity(hid, s)} for s in upcoming_slots(now_irt())]


class ReservationIn(BaseModel):
    hub_id: str = Field(max_length=32)
    slot: AwareDatetime
    name: str = Field(min_length=2, max_length=60)
    phone: str = Field(pattern=r"^09\d{9}$")


@app.post("/api/reservations", status_code=201)
def reserve(body: ReservationIn):
    if body.hub_id not in HUB or not HUB[body.hub_id][6]:
        raise HTTPException(404, "hub_not_found")
    slot = body.slot.astimezone(IRT)
    if slot not in upcoming_slots(now_irt()):
        raise HTTPException(409, "slot_unavailable")
    with _lock:
        if len(_reservations) >= MAX_ROWS or slot_capacity(body.hub_id, slot) <= 0:
            raise HTTPException(409, "slot_full")
        code = "ISN-" + secrets.token_hex(3).upper()
        key = (body.hub_id, slot.isoformat())
        _booked[key] = _booked.get(key, 0) + 1
        _reservations[code] = {"code": code, "hub_id": body.hub_id, "slot": slot.isoformat(), "name": body.name.strip()}
    return {**_reservations[code], "hold_minutes": 10, "toman_per_kwh": tariff(slot)[1]}


class LeadIn(BaseModel):
    company: str = Field(min_length=2, max_length=80)
    kind: Literal["taxi", "logistics", "corporate", "parking"]
    fleet_size: int = Field(ge=1, le=100_000)
    phone: str = Field(pattern=r"^0\d{10}$")


@app.post("/api/leads", status_code=201)
def lead(body: LeadIn):
    with _lock:
        if len(_leads) >= MAX_ROWS:
            raise HTTPException(429, "try_later")
        _leads.append(body.model_dump())
        return {"ok": True, "id": len(_leads)}


# ---- plan financials (billion toman, base scenario for 12 hubs / 60 chargers) ----
SETUP = [
    ("company", "حسابداری و مالی", "Accounting & finance", 1.5),
    ("company", "حقوقی و قراردادها", "Legal & contracts", 8),
    ("company", "ثبت شرکت و برند", "Company & brand registration", 0.5),
    ("company", "دامنه و زیرساخت اولیه", "Domains & base infra", 0.3),
    ("company", "پیش‌پرداخت بیمه‌ها", "Insurance prepayment", 12),
    ("company", "مجوزها و تاییدیه‌ها", "Permits & approvals", 10),
    ("company", "بیمه و مزایای شروع کار", "Start-up benefits", 2),
    ("site", "ودیعه و اجاره پیش‌پرداخت ۱۲ هاب", "Deposits & prepaid rent, 12 hubs", 90),
    ("site", "آماده‌سازی، سایبان، خط‌کشی و ایمنی", "Site prep, canopy & safety", 120),
    ("site", "اتصال برق، ترانس و دیماند", "Grid connection & transformers", 110),
    ("site", "لوازم اداری و عملیاتی", "Office & ops supplies", 2),
    ("equipment", "۶۰ شارژر DC، تابلو، کابل و یدکی", "60 DC chargers, switchgear & spares", 360),
    ("equipment", "خودروهای سرویس و امداد", "Service & rescue vehicles", 25),
    ("equipment", "مخابرات، دوربین و امنیت", "Telecom, cameras & security", 8),
    ("equipment", "نرم‌افزار، اپلیکیشن و مانیتورینگ", "Software, app & monitoring", 26),
    ("launch", "تبلیغات و افتتاح", "Marketing & opening", 18),
    ("launch", "مواد، قطعات و ملزومات", "Materials & consumables", 12),
    ("launch", "سرمایه در گردش", "Working capital", 120),
]
REVENUE = [16, 24, 32, 40, 48, 56, 72, 88, 104, 120, 136, 168]
COGS = [6, 9, 12, 15, 18, 21, 27, 33, 39, 45, 51, 63]
OPEX = [37.7, 37.4, 37.6, 37.8, 38.3, 39.1, 40.1, 40.9, 41.9, 43.0, 44.1, 45.7]
CASH_CHANGE = [-30.3, -24.2, -19.4, -14.6, -10.1, -5.9, 2.3, 11.5, 20.5, 29.4, 38.3, 55.1]
OPENING_CASH = 80


@app.get("/api/financials")
def financials():
    months, cash = [], OPENING_CASH
    for i, (rev, cogs, opex, dc) in enumerate(zip(REVENUE, COGS, OPEX, CASH_CHANGE)):
        cash = round(cash + dc, 1)
        months.append({"m": i + 1, "revenue": rev, "cogs": cogs, "gross": rev - cogs, "opex": opex, "net": round(rev - cogs - opex, 1), "cash": cash})
    return {
        "unit": "billion_toman",
        "funding": {"equity": 325, "loan": 500, "total": 825},
        "setup": [{"group": g, "fa": fa, "en": en, "amount": a} for g, fa, en, a in SETUP],
        "months": months,
        "totals": {
            "revenue": sum(REVENUE),
            "gross": sum(REVENUE) - sum(COGS),
            "net": round(sum(m["net"] for m in months), 1),
            "gross_margin": round((sum(REVENUE) - sum(COGS)) / sum(REVENUE), 3),
            "breakeven_month": next(m["m"] for m in months if m["net"] > 0),
            "min_cash": min(m["cash"] for m in months),
            "end_cash": cash,
        },
    }
