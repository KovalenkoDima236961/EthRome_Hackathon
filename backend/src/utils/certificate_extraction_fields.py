from __future__ import annotations

import re
from typing import IO, Dict, List, Optional, Tuple

import numpy as np
import cv2
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image, ImageEnhance, ImageFilter

Box = Tuple[int, int, int, int]


def scale_coords(coords: Box, factor: float) -> Box:
    x0, y0, x1, y1 = coords
    return (int(x0 * factor), int(y0 * factor), int(x1 * factor), int(y1 * factor))


def extract_certificate_parts(img: Image.Image) -> str:
    base_parts: List[Box] = [
        (4830, 350, 4960, 550),  # UC
        (4987, 350, 5300, 550),  # block 1
        (5308, 350, 5475, 550),  # block 2
        (5495, 350, 5647, 550),  # block 3
        (5670, 350, 5833, 550),  # block 4
        (5850, 350, 6530, 550),  # block 5
    ]
    dpi = 400
    factor: float = dpi / 300.0
    scaled_parts: List[Box] = [scale_coords(b, factor) for b in base_parts]

    parts: List[str] = []
    for coords in scaled_parts:
        part_img = img.crop(coords)
        gray = part_img.convert("L")
        contrast = ImageEnhance.Contrast(gray).enhance(2.5)
        arr = np.array(contrast)

        if arr.dtype != np.uint8:
            arr = arr.astype(np.uint8)

        _, bw = cv2.threshold(arr, 130, 255, cv2.THRESH_BINARY)
        binarized = Image.fromarray(bw)
        part_text: str = pytesseract.image_to_string(binarized, config="--psm 7")
        parts.append(
            part_text.strip().replace("\n", "").replace(" ", "").replace("-", "")
        )

    cert_number = "-".join(parts)
    return cert_number


def _clean_lines(text: str) -> List[str]:
    return [ln.strip() for ln in text.split("\n") if ln and ln.strip()]


def _looks_like_human_name(s: str) -> bool:
    return bool(re.match(r"^[A-ZÀ-Ý][a-zà-ÿ'’\-]+ [A-ZÀ-Ý][a-zà-ÿ'’\-]+$", s))


def _is_breaker_line(s: str) -> bool:
    s_low = s.lower()
    return any(
        key in s_low
        for key in [
            "instructor", "instructors",
            "date", "length", "udemy",
            "hours", "certificate id", "certificateid"
        ]
    )


def _merge_reasonable_title_lines(lines: List[str]) -> str:
    title_chunks: List[str] = []
    for ln in lines:
        if _is_breaker_line(ln):
            break
        if "CERTIFICATE" in ln.upper():
            continue
        if len(ln.strip()) >= 3:
            title_chunks.append(ln.strip())

    if len(title_chunks) > 2:
        title_chunks = sorted(title_chunks, key=len, reverse=True)[:2]
    return " ".join(title_chunks).strip()


def extract_certificate_fields(img: Image.Image, cert_id: Optional[str] = None) -> Dict[str, str]:
    text: str = pytesseract.image_to_string(img)
    lines: List[str] = _clean_lines(text)

    instructor: Optional[str] = None
    for i, line in enumerate(lines):
        if "Instructors" in line or "Instructor" in line:
            after = line.split("Instructors")[-1] if "Instructors" in line else line.split("Instructor")[-1]
            after = after.strip(":-—– ")
            instructor = after if after else (lines[i + 1] if i + 1 < len(lines) else None)
            break

    course_name: str = ""
    success_idx = next((i for i, ln in enumerate(lines) if "has successfully completed" in ln.lower()), None)
    if success_idx is not None:
        following = lines[success_idx + 1:]
        candidate = _merge_reasonable_title_lines(following)
        if candidate:
            course_name = candidate

    if not course_name:
        try:
            start_idx = next(
                i for i, ln in enumerate(lines) if "certificate of completion" in ln.lower()
            )
        except StopIteration:
            start_idx = 0
        try:
            end_idx = next(
                i for i, ln in enumerate(lines) if "instructor" in ln.lower()
            )
        except StopIteration:
            end_idx = len(lines)

        block = lines[start_idx:end_idx]
        block_clean = [
            ln for ln in block
            if "CERTIFICATE" not in ln.upper()
            and not _looks_like_human_name(ln)
            and not _is_breaker_line(ln)
        ]
        wordy = [ln for ln in block_clean if len(ln.split()) >= 3]
        candidates = wordy if wordy else block_clean
        if candidates:
            best = sorted(candidates, key=len, reverse=True)[:2]
            course_name = " ".join(best).strip()

    user_name: Optional[str] = None
    for i, line in enumerate(lines):
        if re.match(r"^[A-Z][a-z]+ [A-Z][a-z]+$", line):
            if i + 1 < len(lines) and ("Date" in lines[i + 1] or "Length" in lines[i + 1]):
                user_name = line
                break
    if not user_name:
        for line in lines:
            if re.match(r"^[A-Z][a-z]+ [A-Z][a-z]+$", line):
                user_name = line
                break

    return {
        "Certificate ID": cert_id or "Not found",
        "Instructor": instructor or "Not found",
        "Course Name": course_name or "Not found",
        "User Name & Surname": user_name or "Not found",
    }


def extract_certificate_from_pdf(file: IO[bytes]) -> Dict[str, str]:
    file_bytes: bytes = file.read()
    pages: List[Image.Image] = convert_from_bytes(file_bytes, dpi=400)
    if not pages:
        raise ValueError("No pages found in PDF")

    img: Image.Image = pages[0]

    cert_id: Optional[str] = extract_certificate_parts(img)
    if cert_id is None:
        raise Exception("Cert is None")

    fields: Dict[str, str] = extract_certificate_fields(img, cert_id=cert_id)
    return fields
