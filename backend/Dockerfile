# Base image pinned by digest: a re-pushed tag can't change what we build on.
FROM python:3.12-slim@sha256:05cda9777409a9c3ffddd94a4c476b79f0769a0b4857f0c7ed9226b6800b0d6f
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.lock .
# wheels/ is vendored because PyPI's CDN is unreachable from the build VM here.
# Refresh: pip download --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -d wheels -r requirements.txt
#          then regenerate requirements.lock (name==version --hash=sha256:<sha256sum of the wheel>).
# --require-hashes: pip refuses any wheel whose bytes differ from the reviewed lock, and any unpinned dependency.
COPY wheels ./wheels
RUN pip install --no-cache-dir --no-index --require-hashes --find-links wheels -r requirements.lock && rm -rf wheels && useradd --create-home app
COPY app ./app
USER app
EXPOSE 8000
# One worker on purpose: bookings live in memory, a second worker would double-sell seats.
# Proxy headers are trusted only from FORWARDED_ALLOW_IPS (set in docker-compose, where nothing but the frontend can reach this port).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--no-server-header", "--timeout-keep-alive", "5", "--limit-concurrency", "200"]
