# syntax = docker/dockerfile:1.4

ARG IMAGE_TAG=20.15.1-bullseye

# ----------------------------------------------------------
# Fetch dependencies
# ----------------------------------------------------------

FROM --platform=$TARGETPLATFORM node:${IMAGE_TAG} AS fetcher

RUN corepack enable

WORKDIR /misskey

COPY ./package.json ./pnpm-lock.yaml ./

RUN pnpm fetch --prod

# ----------------------------------------------------------
# Build Wisteria
# ----------------------------------------------------------

FROM --platform=$TARGETPLATFORM fetcher AS builder

RUN pnpm fetch

COPY --link . ./

RUN pnpm install --offline --frozen-lockfile

RUN git submodule update --init

ENV NODE_ENV=production

RUN pnpm build

# ----------------------------------------------------------
# Install dependencies & Setting up assets
# ----------------------------------------------------------

FROM --platform=$TARGETPLATFORM fetcher AS installer

COPY --link ./healthcheck.sh                            ./healthcheck.sh
COPY --link ./packages/backend/assets                   ./packages/backend/assets
COPY --link ./packages/backend/migration                ./packages/backend/migration
COPY --link ./packages/backend/nsfw-model               ./packages/backend/nsfw-model
COPY --link ./packages/backend/ormconfig.js             ./packages/backend/ormconfig.js
COPY --link ./packages/backend/package.json             ./packages/backend/package.json
COPY --link ./packages/frontend/assets                  ./packages/frontend/assets
COPY --link ./packages/frontend/package.json            ./packages/frontend/package.json
COPY --link ./packages/http-signature/package.json      ./packages/http-signature/package.json
COPY --link ./packages/identicon-generator/package.json ./packages/identicon-generator/package.json
COPY --link ./packages/misskey-bubble-game/package.json ./packages/misskey-bubble-game/package.json
COPY --link ./packages/misskey-js/package.json          ./packages/misskey-js/package.json
COPY --link ./packages/misskey-reversi/package.json     ./packages/misskey-reversi/package.json
COPY --link ./packages/parcom/package.json              ./packages/parcom/package.json
COPY --link ./packages/sw/package.json                  ./packages/sw/package.json
COPY --link ./pnpm-workspace.yaml                       ./pnpm-workspace.yaml

RUN pnpm install --prod --offline --frozen-lockfile

COPY --link --from=builder /misskey/built                              ./built
COPY --link --from=builder /misskey/fluent-emojis                      ./fluent-emojis
COPY --link --from=builder /misskey/packages/backend/built             ./packages/backend/built
COPY --link --from=builder /misskey/packages/http-signature/built      ./packages/http-signature/built
COPY --link --from=builder /misskey/packages/identicon-generator/built ./packages/identicon-generator/built
COPY --link --from=builder /misskey/packages/misskey-bubble-game/built ./packages/misskey-bubble-game/built
COPY --link --from=builder /misskey/packages/misskey-js/built          ./packages/misskey-js/built
COPY --link --from=builder /misskey/packages/misskey-reversi/built     ./packages/misskey-reversi/built
COPY --link --from=builder /misskey/packages/parcom/built              ./packages/parcom/built

# ----------------------------------------------------------
# Build a image
# ----------------------------------------------------------

FROM --platform=$TARGETPLATFORM node:${IMAGE_TAG}-slim AS runner

RUN \
	apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg tini curl libjemalloc2 \
	&& ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists \
	&& corepack enable

COPY --link --from=installer /misskey /misskey

WORKDIR /misskey

ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so
ENV NODE_ENV=production

HEALTHCHECK --interval=5s --retries=20 CMD ["/bin/bash", "/misskey/healthcheck.sh"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "run", "migrateandstart"]
