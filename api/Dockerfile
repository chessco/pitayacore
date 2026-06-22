FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate --schema=prisma/mysql.prisma
RUN npx prisma generate --schema=prisma/postgres.prisma
RUN mkdir -p public
RUN touch create-system-user.js
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/create-system-user.js ./

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
