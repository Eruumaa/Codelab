FROM gcc:latest
RUN apt-get update && apt-get install -y valgrind && rm -rf /var/lib/apt/lists/*
WORKDIR /app