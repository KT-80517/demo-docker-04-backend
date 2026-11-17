# syntax=docker/dockerfile:1
# ---- Dependencies: install production packages only ----
# ---- Dependencies: install production packages only ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Runtime ----
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_SOURCE=json \
    JSON_DB_PATH=/app/data/todos.json
WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node db ./db

# The JSON data file lives here; mount a volume to keep todos across restarts.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run node directly (not via npm) so SIGTERM reaches the app's graceful shutdown.
CMD ["node", "src/server.js"]
