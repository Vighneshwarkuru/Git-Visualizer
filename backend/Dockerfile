FROM node:20-alpine

# Install git so the backend can execute native git commands
RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/server.js"]
