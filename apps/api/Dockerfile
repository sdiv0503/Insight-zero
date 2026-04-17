# Swapped Alpine for Debian Bullseye Slim (Native C/C++ and SSL support)
FROM node:20-bullseye-slim

# Install OpenSSL required by Prisma's Rust engine
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/ 

# Install dependencies and force Prisma v5
RUN npm install
RUN npm install prisma@5 @prisma/client@5

# Generate the Linux-compatible Prisma Client
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]