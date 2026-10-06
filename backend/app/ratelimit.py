import time
from collections import defaultdict


class TokenBucket:
    """Per-key token bucket; `allow()` is O(1) and never blocks."""

    def __init__(self, per_minute: int, burst: int | None = None):
        self.rate = per_minute / 60.0
        self.capacity = float(burst if burst is not None else max(1, per_minute // 4))
        self._state: dict[str, tuple[float, float]] = defaultdict(lambda: (self.capacity, time.monotonic()))

    def allow(self, key: str) -> bool:
        tokens, last = self._state[key]
        now = time.monotonic()
        tokens = min(self.capacity, tokens + (now - last) * self.rate)
        if tokens < 1.0:
            self._state[key] = (tokens, now)
            return False
        self._state[key] = (tokens - 1.0, now)
        return True

    def reset(self) -> None:
        self._state.clear()
