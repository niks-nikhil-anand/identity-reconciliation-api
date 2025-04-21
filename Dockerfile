# Use the official Node.js LTS image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma files and generate the Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Set the environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "dev"]
