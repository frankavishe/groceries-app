# specs/hardening/design.md's AWS Deploy IaC section (Req 16).
# node:24-alpine matches this project's actual dev Node version (`node
# --version` -> v24.15.0), not an arbitrary LTS pick — see design.md.

# ---- deps: full (dev+prod) node_modules, needed to run `nest build` ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile TypeScript -> dist/ ----
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- prod-deps: production-only node_modules, no dev/build tooling ----
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: the actual image that ships ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Mount point for the local-disk upload fallback (uploads/local-disk-upload.adapter.ts)
# — unused whenever AWS_* env vars select the real S3UploadAdapter (the
# production case), kept only so the image behaves identically to local dev
# if it's ever run without S3 configured.
RUN mkdir -p uploads && chown -R node:node uploads

USER node
EXPOSE 4000

# specs/hardening/design.md's Health Endpoint section — /health is
# unauthenticated and excluded from the api/v1 prefix specifically so both
# this HEALTHCHECK and an ALB/ECS target group can hit it directly. Uses
# Node's built-in fetch rather than installing curl/wget into the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
