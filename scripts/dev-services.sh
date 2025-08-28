#!/bin/bash

# WebSeeds Development Services Manager
# This script manages Docker services for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
}

# Function to start services
start_services() {
    print_status "Starting WebSeeds development services..."
    check_docker
    
    # Start services in detached mode
    docker-compose up -d
    
    print_status "Waiting for services to be healthy..."
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    docker-compose exec -T redis redis-cli ping > /dev/null 2>&1
    while [ $? -ne 0 ]; do
        sleep 2
        docker-compose exec -T redis redis-cli ping > /dev/null 2>&1
    done
    print_success "Redis is ready!"
    
    # Wait for Inngest
    print_status "Waiting for Inngest..."
    sleep 5
    
    print_success "All services are running!"
    print_status "Services available at:"
    echo "  - Inngest Dev Server: http://localhost:8288"
    echo "  - Redis: localhost:6379"
    echo ""
    print_status "To view logs: ./scripts/dev-services.sh logs"
    print_status "To stop services: ./scripts/dev-services.sh stop"
}

# Function to stop services
stop_services() {
    print_status "Stopping WebSeeds development services..."
    docker-compose down
    print_success "Services stopped!"
}

# Function to restart services
restart_services() {
    print_status "Restarting WebSeeds development services..."
    stop_services
    start_services
}

# Function to show logs
show_logs() {
    if [ -z "$2" ]; then
        print_status "Showing logs for all services..."
        docker-compose logs -f
    else
        print_status "Showing logs for $2..."
        docker-compose logs -f "$2"
    fi
}

# Function to show status
show_status() {
    print_status "Service status:"
    docker-compose ps
}

# Function to clean up
cleanup() {
    print_status "Cleaning up WebSeeds development services..."
    docker-compose down -v
    docker-compose rm -f
    print_success "Cleanup complete!"
}

# Main script logic
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    clean)
        cleanup
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs [service]|status|clean}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all development services"
        echo "  stop     - Stop all development services"
        echo "  restart  - Restart all development services"
        echo "  logs     - Show logs for all services or specific service"
        echo "  status   - Show status of all services"
        echo "  clean    - Stop services and remove volumes"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs inngest"
        echo "  $0 status"
        exit 1
        ;;
esac
