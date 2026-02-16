FROM openresty/openresty:alpine-fat

RUN apk add --no-cache gettext

COPY nginx.conf.template /usr/local/openresty/nginx/conf/nginx.conf.template

CMD ["/bin/sh", "-c", "envsubst '${DOMAIN} ${ADMIN_DOMAIN}' < /usr/local/openresty/nginx/conf/nginx.conf.template > /usr/local/openresty/nginx/conf/nginx.conf && exec openresty -g 'daemon off;'"]

EXPOSE 443
