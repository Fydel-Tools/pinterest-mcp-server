# Pinterest MCP server, remote HTTP transport. Multi-stage build keeps the
# runtime image lean. Mirrors the brain-v2 / faire-mcp / amazon-sp deploy shape.
# Tokens persist on a Railway volume mounted at /data (PINTEREST_TOKEN_PATH=/data/tokens.json).
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 8080
# Remote Streamable-HTTP entrypoint. For local stdio use `node dist/index.js`.
CMD ["node", "dist/http.js"]
