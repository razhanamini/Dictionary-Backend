# Use Node LTS
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune dev dependencies to keep image slim
RUN npm prune --omit=dev && npm cache clean --force

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Run compiled server
CMD ["node", "dist/index.js"]
