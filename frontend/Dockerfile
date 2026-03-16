FROM node:24

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --include=optional

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
