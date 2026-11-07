# Multi-stage Dockerfile for FinWise AI
FROM node:22-alpine AS builder

WORKDIR /app
COPY client/package*.json ./client/
RUN npm install --prefix client

COPY client ./client
RUN npm run build --prefix client

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY server/package*.json ./server/
RUN npm install --prefix server --production

COPY server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

CMD ["node", "server/src/server.js"]
