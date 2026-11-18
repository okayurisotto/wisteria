# syntax = docker/dockerfile:1

ARG IMAGE_TAG=26.13.1-trixie

# ----------------------------------------------------------
# Fetch dependencies
# ----------------------------------------------------------

FROM --platform=$TARGETPLATFORM node:${IMAGE_TAG} AS fetcher

RUN npm install -g pnpm

WORKDIR /misskey

COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./

RUN pnpm fetch --prod

# ----------------------------------------------------------
# Build Wisteria
# ----------------------------------------------------------

FROM --platform=$TARGETPLATFORM fetcher AS builder

RUN pnpm fetch

COPY . ./

RUN pnpm install --offline --frozen-lockfile

ENV NODE_ENV=production

RUN pnpm build

# ----------------------------------------------------------
# Install dependencies & Setting up assets
# ----------------------------------------------------------

FROM --platform=$TARGETPLATFORM fetcher AS installer

COPY --parents \
	./healthcheck.sh \
	./scripts \
	./packages/*/package.json \
	./packages/backend/assets \
	./packages/backend/migration \
	./packages/backend/ormconfig.js \
	./packages/frontend/assets \
	.

RUN pnpm install --prod --offline --frozen-lockfile

COPY --parents --from=builder \
	/misskey/./packages/*/built \
	.

# ----------------------------------------------------------
# Build a image
# ----------------------------------------------------------

FROM --platform=$TARGETPLATFORM node:${IMAGE_TAG}-slim AS runner

RUN \
	apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg libjemalloc2 \
	&& ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists \
	&& npm install -g pnpm

COPY --from=installer /misskey /misskey

WORKDIR /misskey

ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so
ENV NODE_ENV=production

HEALTHCHECK --interval=5s --retries=20 CMD ["/bin/bash", "/misskey/healthcheck.sh"]

CMD ["node", "./scripts/start.mjs", "--migration"]
