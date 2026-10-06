"""Email delivery seam. No provider is wired up: messages are logged and kept in `outbox`.

Swap `send` for SendGrid/Postmark/SES (see docs/BACKEND_PLAN.md §14) to deliver for real.
"""

import logging

log = logging.getLogger("dash.mail")
outbox: list[dict] = []


def send(to: str, subject: str, body: str) -> None:
    outbox.append({"to": to, "subject": subject, "body": body})
    del outbox[:-100]
    log.info("email to=%s subject=%s", to, subject)
