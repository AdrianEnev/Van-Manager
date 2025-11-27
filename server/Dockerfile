# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=23.11.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# -------- Build stage --------
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and tsconfig base
COPY package.json tsconfig.json ./
COPY ../tsconfig.base.json ./

# Install node modules (including devDependencies for building)
RUN npm install

# Copy application code including config-src
COPY . ./

# No TypeScript build needed - using tsx directly

# -------- Runtime stage --------
FROM base

# Copy only the necessary files
COPY package.json tsconfig.json ./

# Install production dependencies only (this will install linux-specific binaries)
# Cache break: 2025-11-26-use-import-flag
RUN npm install --include=dev

# Copy application code
COPY . ./

# No TypeScript build needed - using node with tsx loader

# Expose the port your app listens on
EXPOSE 4000

# Start the server
CMD [ "npm", "start" ]
