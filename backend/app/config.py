"""Runtime configuration, read from environment variables (see backend/.env.example)."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    env: str = Field(default="development", alias="ENV")
    database_url: str = Field(default="sqlite+aiosqlite:///./dash.db", alias="DATABASE_URL")

    jwt_secret: str = Field(default="dev-only-jwt-secret-change-me-0123456789", alias="JWT_SECRET")
    access_token_minutes: int = Field(default=15, alias="ACCESS_TOKEN_MINUTES")
    refresh_token_days: int = Field(default=30, alias="REFRESH_TOKEN_DAYS")
    bcrypt_rounds: int = Field(default=12, alias="BCRYPT_ROUNDS")
    reset_token_minutes: int = Field(default=30, alias="RESET_TOKEN_MINUTES")

    cors_origins: str = Field(default="http://localhost:5173,http://127.0.0.1:5173", alias="CORS_ORIGINS")
    # Regex for extra allowed origins, e.g. Vercel previews: https://.*\.vercel\.app
    cors_origin_regex: str | None = Field(default=None, alias="CORS_ORIGIN_REGEX")

    tick_engine_enabled: bool = Field(default=True, alias="TICK_ENGINE_ENABLED")
    # Seed for the synthetic price generator. Set it in production so the
    # fairness commitments survive restarts.
    engine_secret: str = Field(default="dev-only-engine-secret", alias="ENGINE_SECRET")
    provider_bot_enabled: bool = Field(default=True, alias="PROVIDER_BOT_ENABLED")
    provider_bot_interval_seconds: float = Field(default=30.0, alias="PROVIDER_BOT_INTERVAL_SECONDS")

    demo_start_balance: float = Field(default=10_000.0, alias="DEMO_START_BALANCE")
    min_stake: float = Field(default=0.35, alias="MIN_STAKE")
    max_stake: float = Field(default=5_000.0, alias="MAX_STAKE")
    max_duration_ticks: int = Field(default=10, alias="MAX_DURATION_TICKS")
    min_withdrawal: float = Field(default=10.0, alias="MIN_WITHDRAWAL")
    max_simulated_deposit: float = Field(default=100_000.0, alias="MAX_SIMULATED_DEPOSIT")
    trade_rate_per_minute: int = Field(default=120, alias="TRADE_RATE_PER_MINUTE")

    max_login_failures: int = Field(default=5, alias="MAX_LOGIN_FAILURES")
    login_lock_minutes: int = Field(default=15, alias="LOGIN_LOCK_MINUTES")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and (s.jwt_secret.startswith("dev-only") or s.engine_secret.startswith("dev-only")):
        raise RuntimeError("JWT_SECRET and ENGINE_SECRET must be set when ENV=production")
    return s
