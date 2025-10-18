# Udemy Certificate Verifier – Backend (FastAPI)

A FastAPI backend that:
1) extracts fields (certificate ID, course name, instructor, user name) from a **Udemy certificate PDF** using OCR, and  
2) verifies them against the **official Udemy certificate page** via Selenium.

> ⚠️ This README also points out a few code fixes you should apply (typos & missing imports) to make the app run smoothly.

---

## ✨ Features

- **PDF → OCR** using `pdf2image`, `pytesseract`, `opencv-python`, and `Pillow`
- **Robust course title extraction** from common Udemy certificate layouts
- **Verification** against Udemy certificate page with **Selenium + Chrome (headless)**
- Simple REST API:
  - `GET /api/health` → returns `"good"`
  - `POST /api/verify_certificate` → accepts a certificate PDF and returns verification status + extracted fields

---

## 🧱 Project Structure (suggested)
```
.
├── main.py                         # FastAPI app entrypoint
├── routes.py                       # API router (health + verify_certificate endpoints)
├── certificate_extraction.py       # OCR utilities: extract parts, fields, parse text
├── certificate_extraction_fields.py# (optional) scraping helpers, or keep `scrap_udemy` here
├── README.md
└── requirements.txt                # (recommended) Python dependencies
```

> In your current code sample, `scrap_udemy` appears twice: once as an import and once as a function definition.  
> **Choose one place** for it (e.g., keep it in `certificate_extraction_fields.py`) and import it from there.

---

## 🐍 Requirements

- **Python** 3.10+
- **Tesseract OCR** (binary) – required by `pytesseract`
- **Poppler** – required by `pdf2image` to rasterize PDFs
- **Google Chrome / Chromium** + **matching ChromeDriver** (for Selenium)

### Debian/Ubuntu
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr poppler-utils
# Chrome (choose ONE of Chrome or Chromium)
# For Google Chrome stable:
wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt-get install -y ./google-chrome-stable_current_amd64.deb
# OR for Chromium:
# sudo apt-get install -y chromium-browser
```

### macOS (Homebrew)
```bash
brew install tesseract poppler
brew install --cask google-chrome
```

> If the server runs in CI/containers, consider using `undetected-chromedriver` or `webdriver-manager` to auto-manage the driver. See **Selenium notes** below.

---

## 📦 Python dependencies

Create a virtual environment and install libs:

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install fastapi uvicorn[pstandard] pillow pytesseract pdf2image opencv-python numpy selenium python-dotenv
```

> If you plan to use driver auto-management:  
> `pip install webdriver-manager` or `pip install undetected-chromedriver`

Recommended `requirements.txt`:
```
fastapi
uvicorn[pstandard]
pillow
pytesseract
pdf2image
opencv-python
numpy
selenium
python-dotenv
# Optional helpers:
# webdriver-manager
# undetected-chromedriver
```

---

## ⚙️ Environment Variables

Create a `.env` file (or set vars in your process manager):

```
# Example Udemy certificate base link
UDEMY_LINK=https://www.udemy.com/certificate/UC-
# CORS: adjust if your frontend is not on localhost:5173
FRONTEND_ORIGIN=http://localhost:5173
ISSUER_PRIVATE_KEY=
```

In code you read the base link and then append the certificate ID + trailing slash:  
`https://www.udemy.com/certificate/UC-<ID>/`

---

## ▶️ Running the Server (local dev)

### 1) Set env vars
```bash
cp .env.example .env   # if you keep an example file
# then edit UDEMY_LINK etc.
```

### 2) Start API
```bash
uvicorn main:app --reload --port 8000
# Server at: http://localhost:8000
```

> The provided code uses CORS to allow `http://localhost:5173` (Vite dev server).  
> Update `allow_origins` if your frontend runs elsewhere.

---

## 🌐 REST API

### Health
`GET /api/health` → `"good"`

```bash
curl -s http://localhost:8000/api/health
```

### Verify Certificate
`POST /api/verify_certificate` (multipart/form-data) with a `file` field containing a Udemy certificate **PDF**.

**Request**
```bash
curl -X POST "http://localhost:8000/api/verify_certificate" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/udemy_certificate.pdf"
```

**Successful Response (example)**
```json
{
  "is_verified": true,
  "fields": {
    "Certificate ID": "UC-ABCD-EFGH-IJKL",
    "Instructor": "Jane Doe",
    "Course Name": "Modern Python: From Zero to Expert",
    "User Name & Surname": "John Smith"
  },
  "certificate_url": "https://www.udemy.com/certificate/UC-ABCD-EFGH-IJKL/"
}
```

**Failure Response (example)**
```json
{
  "detail": "An error occurred during processing: UDEMY_LINK environment variable is not set."
}
```

---

## 🧠 How It Works (high level)

1. **PDF → Image(s)** via `pdf2image.convert_from_bytes(dpi=400)`  
2. **Certificate ID** is OCR’d by cropping fixed regions where Udemy places the code blocks, then concatenating parts.  
3. **Text OCR** over the full page extracts:
   - **User Name** (regex for “Firstname Lastname”)
   - **Instructor(s)** (lines after “Instructor(s)”)
   - **Course Name** (heuristics around “has successfully completed” and breaker lines)  
4. **Verification**: uses `UDEMY_LINK` + `<CERT_ID>/` to open Udemy certificate page in headless Chrome and scrape:
   - Recipient name
   - Course title  
   Then compares them with OCR’d values → `is_verified`.

---

## 🧪 Troubleshooting

- **Tesseract not found**: ensure `tesseract` is installed and on PATH. On Linux, `which tesseract` should work.
- **pdf2image errors**: install `poppler` (`pdftoppm` must be present).
- **Selenium / ChromeDriver**:
  - Ensure Chrome/Chromium is installed and the driver matches its version.
  - If matching is painful, use one of:
    - `webdriver-manager`:
      ```python
      from selenium.webdriver.chrome.service import Service
      from webdriver_manager.chrome import ChromeDriverManager
      driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
      ```
    - `undetected-chromedriver`:
      ```python
      import undetected_chromedriver as uc
      driver = uc.Chrome(options=options, headless=True)
      ```
- **OCR quality**: try different DPI (300–400), adaptive thresholding, or tweak `--psm`.
- **CORS**: update `allow_origins` in `main.py` for your frontend origin.

## 📄 License

MIT

