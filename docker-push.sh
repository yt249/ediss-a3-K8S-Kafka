#!/bin/bash

# Load environment variables
set -a
source .env
set +a
DOCKER_USERNAME=yuchingt

# Check if logged in to Docker Hub
echo "Checking Docker Hub login status..."
if ! docker info | grep -q "Username"; then
    echo "Not logged in to Docker Hub. Please login first:"
    docker login
fi

# Build and tag the image
echo "Building image..."
# docker build -t ${DOCKER_USERNAME}/bookstore-api:latest .
docker build -f ../bff-web/Dockerfile -t ${DOCKER_USERNAME}/bff-web .
docker build -f ../bff-mobile/Dockerfile -t ${DOCKER_USERNAME}/bff-mobile .
docker build -f ../customer-service/Dockerfile -t ${DOCKER_USERNAME}/customer-service .
docker build -f ../book-service/Dockerfile -t ${DOCKER_USERNAME}/book-service .

echo "Pushing image to Docker Hub..."
docker push ${DOCKER_USERNAME}/bff-web
docker push ${DOCKER_USERNAME}/bff-mobile
docker push ${DOCKER_USERNAME}/customer-service
docker push ${DOCKER_USERNAME}/book-service

echo "Done! All Images pushed to: ${DOCKER_USERNAME}" 