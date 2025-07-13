FROM openresty/openresty:alpine-fat

RUN apk add --no-cache gettext

COPY nginx.conf.template /usr/local/openresty/nginx/conf/nginx.conf.template
COPY image_auth.lua /usr/local/openresty/nginx/

CMD ["/bin/sh", "-c", "envsubst '${DOMAIN} ${EMAIL} ${AUTH_IMG_HMAC_SECRET}' <  /usr/local/openresty/nginx/conf/nginx.conf.template >  /usr/local/openresty/nginx/conf/nginx.conf && exec openresty -g 'daemon off;'"]

EXPOSE 443
EXPOSE 80
