FROM python:3.12-slim
RUN pip install uv
WORKDIR /app
COPY pyproject.toml .
RUN uv pip install --system -e ".[dev]"
RUN playwright install chromium --with-deps
COPY . .
