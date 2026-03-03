FROM openresty/openresty:alpine-fat
LABEL org.opencontainers.image.source=https://github.com/opencupid/opencupid

RUN apk add --no-cache gettext
RUN opm get xiaocang/lua-resty-openssl
RUN opm get jkeys089/lua-resty-hmac

COPY entrypoint.sh /entrypoint.sh
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY conf.d/ /usr/local/openresty/nginx/conf/conf.d/
COPY media_auth.lua /usr/local/openresty/nginx/media_auth.lua

EXPOSE 443 80
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
