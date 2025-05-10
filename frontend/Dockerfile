FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy rest (prod); in dev we'll mount your local files
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
