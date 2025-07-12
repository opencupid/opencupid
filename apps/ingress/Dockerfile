FROM nginx:alpine

RUN apk add --no-cache gettext nginx-mod-http-js njs

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY auth_img.js /etc/nginx/auth_img.js

CMD ["/bin/sh", "-c", "envsubst '${DOMAIN} ${EMAIL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]

EXPOSE 443
EXPOSE 80
