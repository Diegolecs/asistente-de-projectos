# Use official Node.js 22 LTS slim image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Set production environment default
ENV NODE_ENV=production
ENV PORT=8080

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for vite build and esbuild)
RUN npm install --legacy-peer-deps --include=dev

# Copy application source code and configuration files
COPY tsconfig.json vite.config.ts fix-dirname.js server.ts ./
COPY index.html ./

# Copy Firebase applet configuration (required by googleCalendarService.ts)
COPY firebase-applet-config.json ./

COPY public ./public
COPY src ./src

# Build the client SPA and the backend bundle (dist/server.cjs)
RUN npm run build

# Expose port (Cloud Run sets PORT env var dynamically, defaulting to 8080)
EXPOSE 8080

# Start server using the production bundle
CMD ["node", "dist/server.cjs"]
