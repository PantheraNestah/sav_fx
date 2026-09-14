from fastapi import APIRouter

from ..schemas import Balances
from ..state import store

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/balance", response_model=Balances)
async def get_balance() -> Balances:
    return store.balances


@router.post("/reset-demo", response_model=Balances)
async def reset_demo() -> Balances:
    return store.reset_demo()
