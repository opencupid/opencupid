FROM nginx:alpine AS admin
COPY index.html /admin/index.html

FROM openresty/openresty:alpine-fat

RUN apk add --no-cache gettext

COPY nginx.conf.template /usr/local/openresty/nginx/conf/nginx.conf.template
COPY --from=admin /admin/index.html /usr/local/openresty/nginx/html/index.html

CMD ["/bin/sh", "-c", "envsubst '${ADMIN_DOMAIN}' < /usr/local/openresty/nginx/conf/nginx.conf.template > /usr/local/openresty/nginx/conf/nginx.conf && exec openresty -g 'daemon off;'"]

EXPOSE 443
EXPOSE 80
