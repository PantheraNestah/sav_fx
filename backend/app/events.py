"""Tiny in-process pub/sub used to fan ticks and account events out to WebSockets.

A single-process stand-in for the Redis pub/sub described in docs/BACKEND_PLAN.md:
the interface (publish / subscribe by topic) is what a Redis-backed hub would keep.
"""

import asyncio
from collections import defaultdict
from contextlib import contextmanager
from typing import Any, Iterator


class Hub:
    def __init__(self) -> None:
        self._subs: dict[str, set[asyncio.Queue[Any]]] = defaultdict(set)

    @contextmanager
    def subscribe(self, topic: str, maxsize: int = 256) -> Iterator[asyncio.Queue[Any]]:
        q: asyncio.Queue[Any] = asyncio.Queue(maxsize=maxsize)
        self._subs[topic].add(q)
        try:
            yield q
        finally:
            self._subs[topic].discard(q)
            if not self._subs[topic]:
                self._subs.pop(topic, None)

    def publish(self, topic: str, message: Any) -> None:
        for q in list(self._subs.get(topic, ())):
            if q.full():  # slow consumer: drop the oldest message rather than block the engine
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:  # pragma: no cover
                    pass
            q.put_nowait(message)

    def subscriber_count(self, topic: str) -> int:
        return len(self._subs.get(topic, ()))


hub = Hub()
