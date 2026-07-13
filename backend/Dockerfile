FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --only=production
COPY backend/ .
COPY --from=frontend-builder /build/dist ./dist
EXPOSE 4000
CMD ["node", "src/server.js"]
