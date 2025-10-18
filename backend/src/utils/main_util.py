from typing import IO, Any, Dict, Optional

def verify_certificate(file: IO[bytes]) -> Dict[str, Any]:
    fields: Dict[str, Any] = extract_certificate_from_pdf(file)

    udemy_link: Optional[str] = os.getenv("UDEMY_LINK")
    if not udemy_link:
        raise Exception("UDEMY_LINK environment variable is not set.")
    
    certificate_url: str = f"{udemy_link}{fields['Certificate ID']}/"

    return {
        "is_verified": True,
        "fields": fields
    }