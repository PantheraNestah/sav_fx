from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Notification


class Outbox:
    """Collects events during a DB transaction; published to the hub only after commit."""

    def __init__(self) -> None:
        self.items: list[tuple[str, dict]] = []

    def user(self, user_id: str, type_: str, data: dict) -> None:
        self.items.append((f"user:{user_id}", {"type": type_, "data": data}))

    def flush(self, hub) -> None:
        for topic, msg in self.items:
            hub.publish(topic, msg)
        self.items.clear()


async def add(s: AsyncSession, out: Outbox, user_id: str, title: str, message: str, type_: str = "system") -> Notification:
    n = Notification(user_id=user_id, title=title, message=message, type=type_)
    s.add(n)
    await s.flush()
    out.user(user_id, "notification", notification_dict(n))
    return n


def notification_dict(n: Notification) -> dict:
    return {"id": n.id, "title": n.title, "message": n.message, "timestamp": n.created_at, "type": n.type, "read": n.read}
