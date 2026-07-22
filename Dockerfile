FROM node:24-alpine

WORKDIR /app

# Copy package files ONLY
COPY package*.json ./

# Force complete reinstall with no cache
RUN rm -rf node_modules package-lock.json && npm install --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Verify build output
RUN test -f dist/main.js || (echo "ERROR: dist/main.js missing!" && ls -la dist/ && exit 1)

# Remove devDependencies
RUN npm prune --omit=dev

# Set production env
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["node", "dist/main"]
