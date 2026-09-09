FROM node:20-alpine AS base

WORKDIR /app

# Copy root workspace configurations
COPY package.json turbo.json ./
COPY packages ./packages
COPY services/frontend ./services/frontend

# Install dependencies
RUN npm install

WORKDIR /app/services/frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
