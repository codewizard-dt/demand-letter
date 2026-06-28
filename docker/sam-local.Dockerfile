FROM python:3.12-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash docker.io curl ca-certificates \
  && python3 -m pip install --no-cache-dir --upgrade pip \
  && python3 -m pip install --no-cache-dir aws-sam-cli \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
