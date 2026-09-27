FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
# wheels/ is vendored because PyPI's CDN is unreachable from the build VM here.
# Refresh: pip download --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -d wheels -r requirements.txt
COPY wheels ./wheels
RUN pip install --no-cache-dir --no-index --find-links wheels -r requirements.txt && rm -rf wheels && useradd --create-home app
COPY app ./app
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
