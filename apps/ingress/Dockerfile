FROM openresty/openresty:alpine-fat

RUN apk add --no-cache gettext

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY image_auth.lua /etc/nginx/image_auth.lua

CMD ["/bin/sh", "-c", "envsubst '${DOMAIN} ${EMAIL} ${AUTH_IMG_HMAC_SECRET}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && exec openresty -g 'daemon off;'"]

EXPOSE 443
EXPOSE 80
