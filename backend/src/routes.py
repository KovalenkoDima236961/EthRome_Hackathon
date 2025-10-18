import io
from typing import Dict, Any
from fastapi import APIRouter, File, Request, UploadFile, HTTPException
from utils.cryptographic_operation import build_merkle_proofs, build_tree
from utils.main_util import verify_certificate

router = APIRouter()

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
