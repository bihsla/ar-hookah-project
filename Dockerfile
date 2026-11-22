
FROM php:8.3-cli

WORKDIR /app

COPY . .

RUN mkdir -p /app/data \
    && chmod -R 777 /app/data

CMD php -S 0.0.0.0:${PORT:-10000} -t /app
