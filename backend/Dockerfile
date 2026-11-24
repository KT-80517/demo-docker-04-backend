FROM node:alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_SOURCE=json \
    JSON_DB_PATH=/app/data/todos.json
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY db ./db

RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "src/server.js"]
