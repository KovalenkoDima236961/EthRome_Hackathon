import io
import os
import time
from typing import Dict, Any, Final
from fastapi import APIRouter, File, Request, UploadFile, HTTPException
from utils.cryptographic_operation import build_merkle_proofs, build_tree, keccak_bytes32_hex
from utils.main_util import verify_certificate
from models import SignMintIn, SignMintOut
from utils.sign import _sign_digest_65, eip712_mint_digest, is_bytes32
from web3 import Web3
from eth_account import Account

router = APIRouter()

_ISSUER_PRIVATE_KEY_ENV = os.getenv("ISSUER_PRIVATE_KEY")

if not _ISSUER_PRIVATE_KEY_ENV:
    raise RuntimeError("Missing env: ISSUER_PRIVATE_KEY")

ISSUER_PRIVATE_KEY: Final[str] = _ISSUER_PRIVATE_KEY_ENV

try:
    issuer_acct = Account.from_key(ISSUER_PRIVATE_KEY)
except Exception as e:
    raise RuntimeError(f"ISSUER_PRIVATE_KEY invalid: {e}")

@router.get("/api/health")
async def api_health() -> str:
    return "good"

@router.post("/api/verify_certificate")
async def verify_certificate_endpoint(
    request: Request,
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    
    file_like = io.BytesIO(contents)
    try :
        result = verify_certificate(file_like)
        if (
            not isinstance(result, dict)
            or "fields" not in result
            or not isinstance(result["fields"], dict)
        ):
            raise HTTPException(
                status_code=500, detail="verify_certificate returned unexpected shape"
            )
        
        fields_dict: Dict[str, Any] = result["fields"]

        merkle_root, merkle_salts, _, _ = build_tree(fields_dict)
        field_proofs = build_merkle_proofs(fields_dict, list(fields_dict.keys()), merkle_salts)

        return {
            "is_verified": bool(result.get("is_verified")),
            "fields": fields_dict,
            "merkle_root": merkle_root,
            "merkle_salts": merkle_salts,
            "field_proofs": field_proofs
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during processing: {e}")


@router.post("/api/sign-mint", response_model=SignMintOut)
def sign_mint(inp: SignMintIn) -> Dict[str, Any]:
    try:
        to = Web3.to_checksum_address(inp.to)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid recipient address")
    if not is_bytes32(inp.pdfHash):
        raise HTTPException(status_code=400, detail="PDF hash must be 0x + 64 hex")
    if not is_bytes32(inp.merkleRoot):
        raise HTTPException(status_code=400, detail="Merkle root must be 0x + 64 hex")

    if inp.chainId is None:
        raise HTTPException(
            status_code=400,
            detail=f"chainId missed"
        )
    deadline = int(inp.deadline) if inp.deadline is not None else int(time.time()) + 600

    token_uri_hash_hex = keccak_bytes32_hex(inp.tokenURI)
    digest = eip712_mint_digest(
        to_addr=to,
        token_uri_hash_hex=token_uri_hash_hex,
        pdf_hash_hex=inp.pdfHash,
        merkle_root_hex=inp.merkleRoot,
        deadline=deadline,
        chain_id=inp.chainId,
        verifying_contract=inp.contract_address,
        name="CertificateNFT",
        version="1"
    )

    signature_hex = _sign_digest_65(digest, issuer_acct, ISSUER_PRIVATE_KEY)

    recovered = Account._recover_hash(digest, signature=signature_hex)
    if recovered.lower() != issuer_acct.address.lower():
        raise HTTPException(
            status_code=500,
            detail=f"Internal signing error: recovered {recovered} != issuer {issuer_acct.address}",
        )

    return {
        "signature": signature_hex,
        "deadline": deadline
    }