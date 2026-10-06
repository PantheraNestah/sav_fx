import pytest

from app.config import get_settings


def test_production_refuses_default_or_short_secrets(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENV", "production")
    with pytest.raises(RuntimeError):
        get_settings()
    get_settings.cache_clear()
    monkeypatch.setenv("JWT_SECRET", "short")
    monkeypatch.setenv("ENGINE_SECRET", "x" * 40)
    with pytest.raises(RuntimeError):
        get_settings()
    get_settings.cache_clear()
    monkeypatch.setenv("JWT_SECRET", "j" * 40)
    assert get_settings().is_production
    get_settings.cache_clear()
