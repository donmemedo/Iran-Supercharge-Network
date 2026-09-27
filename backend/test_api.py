"""Run: python test_api.py (or pytest)."""

from fastapi.testclient import TestClient

from app.main import app, charger_states, HUB, slot_capacity, upcoming_slots, now_irt

c = TestClient(app)


def test_network_matches_plan():
    d = c.get("/api/network").json()
    assert d["stats"]["hubs"] == 12 and d["stats"]["chargers"] == 60
    live = [h for h in d["hubs"] if h["live"]]
    assert sum(len(h["chargers"]) for h in live) == 60
    assert d["stats"]["available"] == sum(h["available"] for h in d["hubs"])


def test_states_are_stable_within_a_tick():
    now = now_irt()
    assert charger_states(HUB["milad"], now) == charger_states(HUB["milad"], now)


def test_reservation_flow_and_capacity():
    s = c.get("/api/hubs/palladium/slots").json()[0]
    body = {"hub_id": "palladium", "slot": s["at"], "name": "Sara", "phone": "09121234567"}
    for _ in range(s["left"]):
        r = c.post("/api/reservations", json=body)
        assert r.status_code == 201 and r.json()["code"].startswith("ISN-")
    assert c.post("/api/reservations", json=body).status_code == 409  # slot now full
    assert c.post("/api/reservations", json={**body, "phone": "12345"}).status_code == 422
    assert c.post("/api/reservations", json={**body, "hub_id": "yazd-safaieh"}).status_code == 404  # planned hub
    past = (upcoming_slots(now_irt())[0].replace(year=2020)).isoformat()
    assert c.post("/api/reservations", json={**body, "slot": past}).status_code == 409
    assert slot_capacity("palladium", upcoming_slots(now_irt())[0]) == 0


def test_lead_validation():
    ok = {"company": "Snapp Taxi", "kind": "taxi", "fleet_size": 40, "phone": "02188776655"}
    assert c.post("/api/leads", json=ok).status_code == 201
    assert c.post("/api/leads", json={**ok, "kind": "boat"}).status_code == 422


def test_financials_match_plan():
    t = c.get("/api/financials").json()["totals"]
    assert (t["revenue"], t["gross"], t["net"], t["end_cash"], t["breakeven_month"]) == (904, 565, 81.4, 132.6, 7)
    assert t["min_cash"] == -24.5


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
    print("ok")
