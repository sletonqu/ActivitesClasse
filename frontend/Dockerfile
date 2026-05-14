# Frontend Dockerfile
FROM node:20-alpine
ARG NPM_VERSION=11.14.1
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@${NPM_VERSION}
RUN npm install
COPY . ./
EXPOSE 3000
CMD ["npm", "start"]
