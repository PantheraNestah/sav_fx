import pyotp

from app import mailer
from tests.conftest import auth_headers, register


async def test_register_creates_balances_and_returns_tokens(client):
    t = await register(client)
    assert t["user"]["name"] == "Test Trader" and t["user"]["email"] == "trader@example.com"
    r = await client.get("/api/account/balance", headers=auth_headers(t))
    assert r.json() == {"real": 0.0, "demo": 10000.0}


async def test_register_validation_and_duplicates(client):
    await register(client)
    dup = await client.post("/api/auth/register", json={"fullName": "X", "email": "TRADER@example.com", "password": "longenough"})
    assert dup.status_code == 409
    short = await client.post("/api/auth/register", json={"fullName": "X", "email": "a@b.co", "password": "short"})
    assert short.status_code == 422
    bad = await client.post("/api/auth/register", json={"fullName": "X", "email": "not-an-email", "password": "longenough"})
    assert bad.status_code == 422


async def test_login_success_and_failure(client):
    await register(client)
    ok = await client.post("/api/auth/login", json={"email": "Trader@Example.com", "password": "correct horse"})
    assert ok.status_code == 200 and ok.json()["accessToken"]
    bad = await client.post("/api/auth/login", json={"email": "trader@example.com", "password": "wrong"})
    assert bad.status_code == 401
    ghost = await client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "whatever1"})
    assert ghost.status_code == 401 and ghost.json()["detail"] == bad.json()["detail"]


async def test_login_lockout_after_repeated_failures(client):
    await register(client)
    for _ in range(5):
        r = await client.post("/api/auth/login", json={"email": "trader@example.com", "password": "nope-nope"})
        assert r.status_code == 401
    locked = await client.post("/api/auth/login", json={"email": "trader@example.com", "password": "correct horse"})
    assert locked.status_code == 429


async def test_protected_routes_need_a_valid_token(client):
    assert (await client.get("/api/account/balance")).status_code == 401
    assert (await client.get("/api/account/balance", headers={"Authorization": "Bearer junk"})).status_code == 401
    t = await register(client)
    # a refresh token must not work as an access token
    assert (await client.get("/api/auth/me", headers={"Authorization": f"Bearer {t['refreshToken']}"})).status_code == 401
    assert (await client.get("/api/auth/me", headers=auth_headers(t))).status_code == 200


async def test_refresh_rotates_and_detects_reuse(client):
    t = await register(client)
    r1 = await client.post("/api/auth/refresh", json={"refreshToken": t["refreshToken"]})
    assert r1.status_code == 200
    new = r1.json()
    assert new["refreshToken"] != t["refreshToken"]
    # replaying the rotated-out token revokes everything, including the new one
    replay = await client.post("/api/auth/refresh", json={"refreshToken": t["refreshToken"]})
    assert replay.status_code == 401
    assert (await client.post("/api/auth/refresh", json={"refreshToken": new["refreshToken"]})).status_code == 401


async def test_refresh_via_cookie_and_logout(client):
    t = await register(client)
    assert (await client.post("/api/auth/refresh")).status_code == 200  # httpx client keeps the cookie
    await client.post("/api/auth/logout", json={"refreshToken": t["refreshToken"]})
    assert (await client.post("/api/auth/refresh", json={"refreshToken": t["refreshToken"]})).status_code == 401


async def test_forgot_and_reset_password_flow(client):
    await register(client)
    unknown = await client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    known = await client.post("/api/auth/forgot-password", json={"email": "trader@example.com"})
    assert unknown.json() == known.json()  # no account enumeration
    assert len(mailer.outbox) == 1
    token = mailer.outbox[0]["body"].rsplit(": ", 1)[1]

    r = await client.post("/api/auth/reset-password", json={"token": token, "newPassword": "brand new pass"})
    assert r.status_code == 200
    assert (await client.post("/api/auth/login", json={"email": "trader@example.com", "password": "correct horse"})).status_code == 401
    assert (await client.post("/api/auth/login", json={"email": "trader@example.com", "password": "brand new pass"})).status_code == 200
    # token is single-use: the password fingerprint no longer matches
    again = await client.post("/api/auth/reset-password", json={"token": token, "newPassword": "another pass 1"})
    assert again.status_code == 400
    assert (await client.post("/api/auth/reset-password", json={"token": "garbage", "newPassword": "another pass 1"})).status_code == 400


async def test_change_password_revokes_sessions(client):
    t = await register(client)
    h = auth_headers(t)
    assert (await client.post("/api/settings/password", headers=h, json={"currentPassword": "bad", "newPassword": "new password 1"})).status_code == 400
    assert (await client.post("/api/settings/password", headers=h, json={"currentPassword": "correct horse", "newPassword": "new password 1"})).status_code == 204
    assert (await client.post("/api/auth/refresh", json={"refreshToken": t["refreshToken"]})).status_code == 401
    assert (await client.post("/api/auth/login", json={"email": "trader@example.com", "password": "new password 1"})).status_code == 200


async def test_profile_update(client):
    t = await register(client)
    r = await client.patch("/api/settings/profile", headers=auth_headers(t), json={"name": "  Alex R  "})
    assert r.json()["name"] == "Alex R"
    assert (await client.get("/api/settings/profile", headers=auth_headers(t))).json()["name"] == "Alex R"


async def test_two_factor_flow(client):
    t = await register(client)
    h = auth_headers(t)
    setup = (await client.post("/api/settings/2fa/setup", headers=h)).json()
    totp = pyotp.TOTP(setup["secret"])
    assert setup["otpauthUri"].startswith("otpauth://totp/")
    assert (await client.post("/api/settings/2fa/enable", headers=h, json={"code": "000000"})).status_code == 400
    assert (await client.post("/api/settings/2fa/enable", headers=h, json={"code": totp.now()})).status_code == 204

    creds = {"email": "trader@example.com", "password": "correct horse"}
    needs = await client.post("/api/auth/login", json=creds)
    assert needs.status_code == 401 and needs.json()["detail"] == "otp_required"
    assert (await client.post("/api/auth/login", json={**creds, "otp": "123456"})).status_code in (401,)
    assert (await client.post("/api/auth/login", json={**creds, "otp": totp.now()})).status_code == 200

    assert (await client.post("/api/settings/2fa/disable", headers=h, json={"code": totp.now(), "password": "wrong"})).status_code == 400
    assert (await client.post("/api/settings/2fa/disable", headers=h, json={"code": totp.now(), "password": "correct horse"})).status_code == 204
    assert (await client.post("/api/auth/login", json=creds)).status_code == 200
