"""Run: python test_api.py (or pytest)."""

import re
from datetime import timedelta

from fastapi.testclient import TestClient

from app.main import HUB, _booked, _reservations, _state, app, charger_states, client_key, hubs_at, now_irt, prune, slot_capacity, upcoming_slots

c = TestClient(app)


def as_ip(ip: str) -> TestClient:
    """Each test gets its own client address, so the per-IP write limit doesn't leak between tests."""
    return TestClient(app, client=(ip, 50000))


def test_network_matches_plan():
    d = c.get("/api/network").json()
    assert d["stats"]["hubs"] == 12 and d["stats"]["chargers"] == 60
    live = [h for h in d["hubs"] if h["live"]]
    assert sum(len(h["chargers"]) for h in live) == 60
    assert d["stats"]["available"] == sum(h["available"] for h in d["hubs"])


def test_states_are_stable_within_a_tick():
    now = now_irt()
    assert charger_states(HUB["milad"], now) == charger_states(HUB["milad"], now)
    tick = int(now.timestamp() // 15)
    assert hubs_at(tick) is hubs_at(tick)  # second poll in the same tick is a cache hit


def test_reservation_flow_and_capacity():
    cl = as_ip("10.0.0.1")
    s = cl.get("/api/hubs/palladium/slots").json()[0]
    body = {"hub_id": "palladium", "slot": s["at"], "name": "Sara", "phone": "09121234567"}
    for i in range(s["left"]):
        r = cl.post("/api/reservations", json={**body, "phone": f"0912000{i:04d}"})
        assert r.status_code == 201 and re.fullmatch(r"ISN-[0-9A-F]{8}", r.json()["code"]) and "phone" not in r.json()
    assert cl.post("/api/reservations", json=body).status_code == 409  # slot now full
    assert cl.post("/api/reservations", json={**body, "phone": "12345"}).status_code == 422
    assert cl.post("/api/reservations", json={**body, "hub_id": "yazd-safaieh"}).status_code == 404  # planned hub
    past = (upcoming_slots(now_irt())[0].replace(year=2020)).isoformat()
    assert cl.post("/api/reservations", json={**body, "slot": past}).status_code == 409
    assert slot_capacity("palladium", upcoming_slots(now_irt())[0]) == 0


def test_two_active_reservations_per_phone():
    cl = as_ip("10.0.0.2")
    slots = [s for s in cl.get("/api/hubs/milad/slots").json() if s["left"]]
    body = {"hub_id": "milad", "name": "Ali", "phone": "09350000001"}
    assert [cl.post("/api/reservations", json={**body, "slot": s["at"]}).status_code for s in slots[:2]] == [201, 201]
    r = cl.post("/api/reservations", json={**body, "slot": slots[2]["at"]})
    assert r.status_code == 409 and r.json()["detail"] == "phone_limit"


def test_rate_limit_per_client():
    cl = as_ip("10.0.0.3")
    ok = {"company": "Snapp Taxi", "kind": "taxi", "fleet_size": 40}
    assert {cl.post("/api/leads", json={**ok, "phone": f"0210000{i:04d}"}).status_code for i in range(10)} == {201}
    r = cl.post("/api/leads", json={**ok, "phone": "02100009999"})
    assert r.status_code == 429 and int(r.headers["retry-after"]) > 0
    assert as_ip("10.0.0.4").post("/api/leads", json={**ok, "phone": "02100009999"}).status_code == 201  # others unaffected


def test_ipv6_clients_grouped_by_64():
    assert client_key("2001:db8::1") == client_key("2001:db8::ffff") != client_key("2001:db8:0:1::1")
    assert client_key("1.2.3.4") == "1.2.3.4" and client_key(None) == "unknown"


def test_expired_reservations_are_pruned():
    now = now_irt()
    old = (upcoming_slots(now)[0] - timedelta(hours=1)).isoformat()
    _reservations["ISN-OLD"] = {"code": "ISN-OLD", "hub_id": "milad", "slot": old, "name": "x", "phone": "09120000000"}
    _booked[("milad", old)] = 1
    _state["window"] = ""  # force the once-per-slot-change sweep
    prune(now)
    assert "ISN-OLD" not in _reservations and ("milad", old) not in _booked


def test_lead_validation():
    cl = as_ip("10.0.0.5")
    ok = {"company": "Snapp Taxi", "kind": "taxi", "fleet_size": 40, "phone": "02188776655"}
    r = cl.post("/api/leads", json=ok)
    assert r.status_code == 201 and r.json() == {"ok": True}  # no sequential id leak
    assert cl.post("/api/leads", json={**ok, "kind": "boat"}).status_code == 422
    assert cl.post("/api/leads", json={**ok, "company": "  "}).status_code == 422  # whitespace-only is stripped, then too short
    assert cl.post("/api/leads", json={**ok, "company": "Acme\nInjected: log line"}).status_code == 422


def test_body_limits_and_hidden_docs():
    big = b'{"company":"' + b"a" * 9000 + b'"}'
    assert c.post("/api/leads", content=big, headers={"content-type": "application/json"}).status_code == 413
    assert c.post("/api/leads", content=iter([b"{}"]), headers={"content-type": "application/json"}).status_code == 411  # chunked
    assert [c.get(p).status_code for p in ("/docs", "/redoc", "/openapi.json")] == [404, 404, 404]


def test_financials_match_plan():
    r = c.get("/api/financials")
    t = r.json()["totals"]
    assert (t["revenue"], t["gross"], t["net"], t["end_cash"], t["breakeven_month"]) == (904, 565, 81.4, 132.6, 7)
    assert t["min_cash"] == -24.5 and "max-age" in r.headers["cache-control"]


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
    print("ok")
