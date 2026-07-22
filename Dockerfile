FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files first
COPY package*.json ./

# Install all dependencies (including devDeps for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application - this creates dist/
RUN npm run build

# Verify dist exists and has content
RUN test -d dist && test -f dist/main.js || (echo "ERROR: dist/main.js not found!" && ls -la && exit 1)

# Remove devDependencies after build
RUN npm prune --omit=dev

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "dist/main"]
