# Swapped Alpine for Debian Bullseye Slim (Native C/C++ and SSL support)
FROM node:20-bullseye-slim

# Install OpenSSL required by Prisma's Rust engine
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/ 

# Install dependencies
RUN npm install

# Generate the Linux-compatible Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npx tsc || true

COPY . .

# Build the compiled output
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]