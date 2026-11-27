# MediAgent — Backend Dockerfile (Task 10: Docker Containerization)
FROM node:18-alpine

WORKDIR /app

# Install system dependencies:
# - python3 + py3-pip: for ML inference (predict.py)
# - tesseract-ocr + eng language data: for OCR
# - poppler-utils: for PDF text extraction
# - build-essential + python3-dev: for native npm modules (better-sqlite3, sharp)
# - libvips-dev: for sharp image processing
RUN apk add --no-cache \
    python3 \
    py3-pip \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    build-base \
    python3-dev \
    libvips-dev \
    && python3 -m pip install --no-cache-dir --break-system-packages \
    numpy \
    pandas \
    scikit-learn \
    joblib \
    shap \
    pdf-parse \
    || true

# Install Node.js dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Create required directories
RUN mkdir -p uploads backups

# Expose backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the server
CMD ["node", "index.js"]
