from typing import IO, Any, Dict, Optional
from certificate_extraction_fields import scrap_udemy

def verify_certificate(file: IO[bytes]) -> Dict[str, Any]:
    fields: Dict[str, Any] = extract_certificate_from_pdf(file)

    udemy_link: Optional[str] = os.getenv("UDEMY_LINK")
    if not udemy_link:
        raise Exception("UDEMY_LINK environment variable is not set.")
    
    certificate_url: str = f"{udemy_link}{fields['Certificate ID']}/"

    username, course_name = scrap_udemy(certificate_url)

    is_verified: bool = (
        fields.get("User Name & Surname") == username and fields.get("Course Name") == course_name
    )

    return {
        "is_verified": is_verified,
        "fields": fields,
        "certificate_url": certificate_url,
    }