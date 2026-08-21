FROM composer:2 AS dependencies

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist --optimize-autoloader

FROM node:24-alpine AS assets

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY resources ./resources
COPY public ./public
COPY tsconfig.json vite.config.js tailwind.config.js postcss.config.js ./
COPY --from=dependencies /app/vendor ./vendor
RUN npm run build

FROM php:8.3-fpm-alpine AS application

WORKDIR /var/www/html

RUN apk add --no-cache libxml2-dev \
    && docker-php-ext-install pdo_mysql opcache soap

COPY . .
COPY --from=dependencies /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build

RUN ln -s ../storage/app/public public/storage \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data

CMD ["php-fpm"]

FROM nginx:1.27-alpine AS nginx

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=application /var/www/html/public /var/www/html/public
