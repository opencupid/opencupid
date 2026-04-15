# Custom Traefik image with the JWT validation plugin baked in.
# Traefik's catalog plugin loader fetches from plugins.traefik.io on every
# boot; using localPlugins with source pre-copied into the image removes
# that runtime dependency entirely.

ARG TRAEFIK_VERSION=v3.6
# Commit SHA, not a tag — tags are mutable and can be force-pushed.
# 030072af is the tree at legege/jwt-validation-middleware tag v0.2.1.
ARG PLUGIN_COMMIT=030072af546973af742434e8ed3c5a06c57db06b

FROM alpine:3 AS fetch
ARG PLUGIN_COMMIT
RUN apk add --no-cache git && \
    mkdir -p /src/github.com/legege/jwt-validation-middleware && \
    cd /src/github.com/legege/jwt-validation-middleware && \
    git init -q && \
    git remote add origin https://github.com/legege/jwt-validation-middleware && \
    git fetch --depth 1 origin ${PLUGIN_COMMIT} && \
    git checkout -q FETCH_HEAD && \
    rm -rf .git

FROM traefik:${TRAEFIK_VERSION}
COPY --from=fetch /src /plugins-local/src
