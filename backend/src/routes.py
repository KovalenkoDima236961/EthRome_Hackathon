import io
from typing import Dict, Any
from fastapi import APIRouter, File, Request, UploadFile, HTTPException

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

        return {
            "is_verified": bool(result.get("is_verified")),
            "fields": fields_dict,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during processing: {e}")
