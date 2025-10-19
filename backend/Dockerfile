FROM python:3.12.8

RUN apt-get update && \
    apt-get install -y \
      tesseract-ocr libtesseract-dev poppler-utils \
      libgl1 libglib2.0-0 \
      chromium chromium-driver fonts-liberation libu2f-udev libvulkan1 && \
    ln -sf /usr/bin/chromium /usr/bin/google-chrome && \
    ln -sf /usr/bin/chromium /usr/bin/google-chrome-stable && \
    if [ -f /usr/lib/chromium/chromedriver ] && [ ! -f /usr/bin/chromedriver ]; then ln -sf /usr/lib/chromium/chromedriver /usr/bin/chromedriver; fi && \
    (google-chrome --version || chromium --version) && chromedriver --version && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app/src

COPY requirements.txt /app/
RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /app/requirements.txt && \
    python -c "import dotenv; print('python-dotenv OK')"

COPY ./src /app/src

EXPOSE 8000
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]