FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY main.go ./

RUN go build -o transfer-worker main.go

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/transfer-worker .

EXPOSE 8080

CMD ["./transfer-worker"]
