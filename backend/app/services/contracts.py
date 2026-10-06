"""Contract pricing and resolution (the server is the only source of truth for payouts).

All three contract groups resolve on the last digit (0-9) of the exit tick's price.
Payout % = (1 / P(win) - 1) * 100 * EDGE, i.e. fair odds less a ~4.7% house margin —
the same formula as frontend/src/lib/payouts.ts.
"""

from dataclasses import dataclass

EDGE = 0.953

GROUPS = {
    "matches_differs": ("Matches/Differs", ("Matches", "Differs")),
    "over_under": ("Over/Under", ("Over", "Under")),
    "even_odd": ("Even/Odd", ("Even", "Odd")),
}


class ContractError(ValueError):
    pass


@dataclass(frozen=True)
class Contract:
    group: str
    side: str
    target_digit: int | None = None
    barrier: int | None = None

    @property
    def label(self) -> str:
        title = GROUPS[self.group][0]
        if self.group == "matches_differs":
            return f"{title} · {self.side} {self.target_digit}"
        if self.group == "over_under":
            return f"{title} · {self.side} {self.barrier}"
        return f"{title} · {self.side}"

    @property
    def win_probability(self) -> float:
        d, b = self.target_digit, self.barrier
        match self.group:
            case "even_odd":
                return 0.5
            case "matches_differs":
                return 0.1 if self.side == "Matches" else 0.9
            case _:
                assert b is not None
                return (9 - b) / 10 if self.side == "Over" else b / 10

    @property
    def payout_pct(self) -> float:
        return round((1 / self.win_probability - 1) * 100 * EDGE, 2)

    def wins(self, digit: int) -> bool:
        match self.group:
            case "even_odd":
                return (digit % 2 == 0) == (self.side == "Even")
            case "matches_differs":
                return (digit == self.target_digit) == (self.side == "Matches")
            case _:
                assert self.barrier is not None
                return digit > self.barrier if self.side == "Over" else digit < self.barrier


def build_contract(group: str, side: str, target_digit: int | None = None, barrier: int | None = None) -> Contract:
    if group not in GROUPS:
        raise ContractError(f"Unknown contract group '{group}'")
    sides = {s.lower(): s for s in GROUPS[group][1]}
    canonical = sides.get(side.strip().lower())
    if canonical is None:
        raise ContractError(f"Side must be one of {', '.join(GROUPS[group][1])} for {group}")

    if group == "matches_differs":
        if target_digit is None or not 0 <= target_digit <= 9:
            raise ContractError("target_digit (0-9) is required for matches_differs")
        return Contract(group, canonical, target_digit=target_digit)
    if group == "over_under":
        if barrier is None or not 0 <= barrier <= 9:
            raise ContractError("barrier (0-9) is required for over_under")
        if (canonical == "Over" and barrier == 9) or (canonical == "Under" and barrier == 0):
            raise ContractError(f"{canonical} {barrier} can never win; pick a different barrier")
        return Contract(group, canonical, barrier=barrier)
    return Contract(group, canonical)


def to_cents(amount: float) -> int:
    return int(round(amount * 100))


def payout_cents(stake_cents: int, pct: float) -> int:
    return int(round(stake_cents * (1 + pct / 100)))
