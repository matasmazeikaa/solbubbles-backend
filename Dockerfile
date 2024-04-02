# Use the official Node.js image as base
FROM node:latest

# Set the working directory in the container
WORKDIR /usr/src/app
# Copy package.json and package-lock.json to the working directory
COPY yarn.lock ./

# Install dependencies

RUN yarn install

# Copy the rest of the application code
COPY . /usr/src/app

# Build TypeScript files
RUN yarn build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["yarn", "start"]
