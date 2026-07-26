# Multi-stage image for LineageStudio.
# Targets: backend (Node API) and frontend (nginx serving the Vite build).

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm install --omit=dev=false

FROM deps AS backend-build
COPY backend ./backend
WORKDIR /app/backend
RUN npm run build

FROM node:24-bookworm-slim AS backend
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/package.json ./backend/package.json
COPY --from=backend-build /app/backend/src/db/schema.sql ./backend/dist/db/schema.sql
COPY --from=backend-build /app/backend/src/db/schema.postgres.sql ./backend/dist/db/schema.postgres.sql
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/server.js"]

FROM deps AS frontend-build
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

FROM nginx:1.27-alpine AS frontend
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
