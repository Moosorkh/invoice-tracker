# Build stage for client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Build stage for server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy built assets from client
COPY --from=client-builder /app/client/dist /app/client/dist

# Copy server files
COPY --from=server-builder /app/server/dist /app/server/dist
COPY --from=server-builder /app/server/node_modules /app/server/node_modules
COPY --from=server-builder /app/server/package.json /app/server/package.json
COPY --from=server-builder /app/server/prisma /app/server/prisma

# Set up for production
WORKDIR /app/server
ENV NODE_ENV=production
CMD ["npm", "start"]