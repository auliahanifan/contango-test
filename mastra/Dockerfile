FROM python:3.10-slim

WORKDIR /mastra

RUN pip install --no-cache-dir mastra openai pdf-parse

COPY . .

CMD ["mastra", "run", "cv-validate"]