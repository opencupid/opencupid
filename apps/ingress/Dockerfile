FROM openresty/openresty:alpine

RUN apk add --no-cache gettext perl curl && \
    opm get SkyLothar/lua-resty-jwt

COPY nginx.conf.template /usr/local/openresty/nginx/nginx.conf.template

CMD ["/bin/sh", "-c", "envsubst '${DOMAIN} ${EMAIL} ${JWT_SECRET}' < /usr/local/openresty/nginx/nginx.conf.template > /usr/local/openresty/nginx/conf/nginx.conf && exec openresty -g 'daemon off;'"]

EXPOSE 443
EXPOSE 80
