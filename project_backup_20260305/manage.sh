#!/bin/bash
# Mikrotik API Environment Manager
# Usage: ./manage.sh [dev|staging|prod] [up|down|logs]

ENV=$1
ACTION=$2

if [ -z "$ENV" ] || [ -z "$ACTION" ]; then
    echo "Usage: ./manage.sh [dev|staging|prod] [up|down|logs]"
    exit 1
fi

if [ ! -d "deploy/$ENV" ]; then
    echo "Error: Environment '$ENV' not found in deploy/"
    exit 1
fi

COMPOSE_FILE="deploy/$ENV/docker-compose.yml"
BASE_COMPOSE="docker-compose.yml"

echo "🚀 Managing Environment: $ENV ($ACTION)"

case $ACTION in
    up)
        docker-compose -f $BASE_COMPOSE -f $COMPOSE_FILE up -d --build
        ;;
    down)
        docker-compose -f $BASE_COMPOSE -f $COMPOSE_FILE down
        ;;
    logs)
        docker-compose -f $BASE_COMPOSE -f $COMPOSE_FILE logs -f
        ;;
    *)
        echo "Invalid action: $ACTION"
        exit 1
        ;;
esac
