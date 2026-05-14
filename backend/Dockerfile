# Backend Dockerfile
FROM node:20-alpine
ARG NPM_VERSION=11.14.1
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@${NPM_VERSION}
RUN apk add --no-cache python3 make g++
RUN npm install
COPY . ./
EXPOSE 4000
CMD ["node", "server.js"]
