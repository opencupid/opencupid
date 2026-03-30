FROM ghcr.io/max-lt/nginx-jwt-module:latest
LABEL org.opencontainers.image.source=https://github.com/opencupid/opencupid

RUN apk add --no-cache gettext nginx-mod-http-headers-more

COPY entrypoint.sh /entrypoint.sh
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

EXPOSE 443 80
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
