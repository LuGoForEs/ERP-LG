FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y gcc libpq-dev pkg-config \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# collectstatic se ejecuta en RUNTIME (command del compose), no en build:
# en build no existe DATABASE_URL y settings.py la evalúa al importar.

CMD ["gunicorn", "--worker-class", "gevent", "--workers", "3", "--worker-connections", "1000", "--timeout", "120", "--bind", "0.0.0.0:8000", "config.wsgi:application"]
