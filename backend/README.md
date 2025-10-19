# Certificate Verifier & Signer (FastAPI)

FastAPI backend that:

1) Extracts **Udemy certificate** fields (name, course, certificate ID) from a **PDF** using OCR.
2) Verifies the fields by scraping the public Udemy certificate page.
3) Builds a **Merkle tree** over extracted fields and returns **field proofs**.
4) Signs an **EIP‑712** `Mint` payload for a Certificate NFT using an **issuer private key**.

> CORS is enabled for `http://localhost:5173`, so you can plug this into a local frontend during development.

---

## Table of contents
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [API](#api)
  - [GET /api/health](#get-apihealth)
  - [POST /api/verify_certificate](#post-apiverify_certificate)
  - [POST /api/sign-mint](#post-apisign-mint)
- [How verification works](#how-verification-works)
- [Merkle construction](#merkle-construction)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Development tips](#development-tips)
- [License](#license)

---

## Architecture

- **FastAPI** app (`main.py`) exposes three endpoints.
- **OCR** via `pytesseract` + `pdf2image` + `opencv` extracts text from the certificate PDF.
- **Web scraping** via **Selenium** (headless Chrome) fetches the **recipient name** and **course name** from Udemy’s public certificate page.
- **Merkle Tree** over the extracted fields is built with deterministic hashing + 32‑byte random per‑field salts.
- **EIP‑712 signing** (`/api/sign-mint`) produces a 65‑byte secp256k1 signature for an off‑chain authorize‑to‑mint flow.

---

## Folder structure

```
.
├─ main.py
├─ models.py
├─ routes.py
├─ .env                   # not committed – see sample below
├─ utils/
│  ├─ main_util.py
│  ├─ sign.py
│  ├─ cryptographic_operation.py
│  ├─ certificate_extraction_fields.py
│  └─ web_scrapper_udemy.py
└─ README.md
```

---

## Prerequisites

### System packages
You need these native deps for OCR and PDF rasterization, plus Selenium:

- **Tesseract OCR**
- **Poppler** (for `pdf2image` to rasterize PDFs)
- **Google Chrome** (or Chromium)
- **ChromeDriver** matching your Chrome version

#### macOS (Homebrew)
```bash
brew install tesseract poppler
brew install --cask google-chrome
# If needed: brew install --cask chromedriver
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y tesseract-ocr poppler-utils
# Install Chrome
wget -qO- https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-linux-signing-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update && sudo apt install -y google-chrome-stable
# Install matching ChromeDriver (adjust VERSION to your Chrome)
CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | cut -d. -f1)
LATEST=$(curl -s https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_${CHROME_VERSION})
wget https://storage.googleapis.com/chrome-for-testing-public/${LATEST}/linux64/chromedriver-linux64.zip
unzip chromedriver-linux64.zip
sudo mv chromedriver-linux64/chromedriver /usr/local/bin/chromedriver
sudo chmod +x /usr/local/bin/chromedriver
```

> If sites detect Selenium, consider using `undetected-chromedriver` or a cloud scraper. For now this project uses plain Selenium with a mobile user-agent.

### Python
- Python **3.10+** recommended

Create a virtual environment and install packages:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Quick start

1) **Clone** this repo and ensure the folder structure matches the tree above.
2) Create **`.env`** (see next section).
3) Install **system** dependencies (Tesseract, Poppler, Chrome, ChromeDriver).
4) Install **Python** dependencies.
5) Run the API:
   ```bash
   uvicorn main:app --reload
   ```
   The server will listen on `http://127.0.0.1:8000` by default.

> CORS allows `http://localhost:5173` by default (configured in `main.py`).

---

## Environment variables

Create a `.env` file **one level above** your `main.py` (as `main.py` loads `../.env`):

```dotenv
# Private key of the **issuer** EOA used to sign EIP-712 Mint messages
ISSUER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HEX
```

- Use a **dedicated** issuer wallet with minimal on-chain funds.

---

## API

### GET `/api/health`
Returns a plain string – useful for liveness checks.

**Response (200):**
```text
good
```

---

### POST `/api/verify_certificate`

**Description**: Accepts a PDF file of a Udemy certificate, OCRs the document, infers key fields, scrapes the public Udemy certificate page, builds a Merkle tree over extracted fields, and returns verification + proofs.

**Request**
- `multipart/form-data` with field `file: <PDF>`

**Response (200)**
```json
{
  "is_verified": true,
  "fields": {
    "Certificate ID": "UC-XXXXXX-XXXXXX-XXXXXX-XXXX",
    "Instructor": "Jane Doe",
    "Course Name": "Mastering Something Great",
    "User Name & Surname": "John Smith"
  },
  "merkle_root": "0x...64hex...",
  "merkle_salts": {
    "Certificate ID": "0x...32bytes...",
    "Instructor": "0x...32bytes...",
    "Course Name": "0x...32bytes...",
    "User Name & Surname": "0x...32bytes..."
  },
  "field_proofs": {
    "Certificate ID": { "salt": "0x...", "proof": ["0x...", "..."] },
    "Instructor":     { "salt": "0x...", "proof": ["0x...", "..."] },
    "Course Name":    { "salt": "0x...", "proof": ["0x...", "..."] },
    "User Name & Surname": { "salt": "0x...", "proof": ["0x...", "..."] }
  }
}
```

**Errors**
- `400` – Empty file
- `500` – OCR/scrape/processing error

---

### POST `/api/sign-mint`

**Description**: Returns an EIP‑712 signature authorizing a mint with fields hashed into the payload.

**Request (JSON)**
```json
{
  "to": "0xRecipientAddress",
  "tokenURI": "ipfs://bafy.../metadata.json",
  "pdfHash": "0x...64hex",
  "merkleRoot": "0x...64hex",
  "deadline": 1734547200,      // optional; defaults to now+600s
  "chainId": 11155111,
  "contract_address": "0xVerifyingContract"
}
```

**Response (200)**
```json
{
  "signature": "0x...130hex...",
  "deadline": 1734547200
}
```

**Validations**
- `to` must be a **checksum** address.
- `pdfHash` and `merkleRoot` must be **bytes32** (`0x` + 64 hex).
- `chainId` is required.
- Signature is **self‑verified** by recovering the signer and matching your `ISSUER_PRIVATE_KEY` address; if mismatch, returns 500.

---

## How verification works

1) **PDF → Image**: `pdf2image.convert_from_bytes(..., dpi=400)` rasterizes page 1.
2) **Certificate ID**: `extract_certificate_parts(...)` crops known regions of the Udemy PDF and OCRs them into segments, then joins into the final ID.
3) **Text mining**: `extract_certificate_fields(...)` uses OCR text + heuristics to infer **Instructor**, **Course Name**, and **User Name & Surname**.
4) **Scraping**: `utils/web_scrapper_udemy.py` opens the public Udemy certificate page and reads the **certificate-recipient-url** and **certificate-course-url** text nodes.
5) **Compare**: If the OCR’d **name** and **course** equal the scraped values, `is_verified = true`.
6) **Merkle**: `utils/cryptographic_operation.py` canonicalizes key/value pairs, salts each leaf (32 bytes), and builds a binary Merkle tree (tagged leaves/nodes) returning the **root** and **proofs**.

---

## Merkle construction

- Leaf preimage: `LEAF_TAG (0x01) || keccak(path) || keccak(canonical(value)) || salt32`
- Node preimage: `NODE_TAG (0x02) || sort(left, right) || concat`
- Hash function: `keccak256`
- Canonicalization:
  - strings as-is
  - numbers to decimal string
  - booleans to `true`/`false`
  - lists/dicts serialized deterministically (sorted keys)
  - `null` for missing

Returned values:
- `merkle_root`: `0x` + 64 hex
- `merkle_salts[path]`: `0x` + 64 hex (one per field)
- `field_proofs[path]`: `{ salt, proof[] }` with sibling hashes bottom→top

---

## License