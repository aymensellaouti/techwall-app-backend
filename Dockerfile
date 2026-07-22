FROM node:24-alpine

# Force rebuild - timestamp: 20260722-090500
WORKDIR /app

# Copy package files ONLY
COPY package*.json ./

# Force complete reinstall with no cache
RUN rm -rf node_modules package-lock.json && npm install --force

# Copy source code
COPY . .

# Build the application with verbose output
RUN npm run build && echo "Build complete, checking output..." && find dist -name "*.js" -type f | head -20

# Verify build output - check both locations
RUN test -f dist/main.js && echo "Found dist/main.js" || \
    (test -f dist/src/main.js && echo "Found dist/src/main.js, copying to dist/main.js" && cp dist/src/main.js dist/main.js && cp -r dist/src/* dist/ && rm -rf dist/src) || \
    (echo "ERROR: main.js not found anywhere!" && ls -la dist/ && exit 1)

# Remove devDependencies
RUN npm prune --omit=dev

# Set production env
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check - give app 2 minutes to start (DB connections can be slow)
HEALTHCHECK --interval=10s --timeout=5s --start-period=120s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start app with logging
CMD ["node", "dist/main"]
