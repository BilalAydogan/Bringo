FROM php:8.3-fpm

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    zip \
    && rm -rf /var/lib/apt/lists/*

ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN chmod +x /usr/local/bin/install-php-extensions && \
    install-php-extensions pdo pdo_pgsql intl zip redis @composer

WORKDIR /var/www/html

CMD ["php-fpm"]
