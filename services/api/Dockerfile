FROM node:20-alpine AS base

WORKDIR /app

# Copy root workspace configurations
COPY package.json turbo.json ./
COPY packages ./packages
COPY services/api ./services/api

# Install dependencies
RUN npm install

WORKDIR /app/services/api
RUN npx prisma generate
RUN npm run build

EXPOSE 5000
CMD ["npm", "run", "start"]
