# Frontend Dockerfile
FROM node:24-alpine
ARG NPM_VERSION=12.2.0
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@${NPM_VERSION}
RUN npm install
COPY . ./
EXPOSE 3000
CMD ["npm", "start"]
