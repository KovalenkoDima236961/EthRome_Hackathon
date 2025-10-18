from typing import Optional
from pydantic import BaseModel

class SignMintIn(BaseModel):
    to: str
    tokenURI: str
    pdfHash: str
    merkleRoot: str
    deadline: Optional[int] = None
    chainId: int
    contract_address: str


class SignMintOut(BaseModel):
    signature: str
    deadline: int