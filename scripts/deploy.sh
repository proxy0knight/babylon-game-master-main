#!/bin/bash

# Babylon.js Game Engine Deployment Script
# This script automates the deployment process for different environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="babylon-game-engine"
FRONTEND_PORT=3000
BACKEND_PORT=5001
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed. Please install Python 3.8 or higher."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    log_success "All dependencies are satisfied."
}

setup_environment() {
    log_info "Setting up environment..."
    
    # Copy environment files if they don't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_info "Created .env from .env.example"
        else
            log_warning ".env.example not found. Please create .env manually."
        fi
    fi
    
    if [ ! -f babylon-server/.env ]; then
        if [ -f babylon-server/.env.example ]; then
            cp babylon-server/.env.example babylon-server/.env
            log_info "Created babylon-server/.env from .env.example"
        else
            log_warning "babylon-server/.env.example not found. Please create babylon-server/.env manually."
        fi
    fi
    
    log_success "Environment setup completed."
}

install_frontend_dependencies() {
    log_info "Installing frontend dependencies..."
    npm install
    log_success "Frontend dependencies installed."
}

install_backend_dependencies() {
    log_info "Installing backend dependencies..."
    cd babylon-server
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        log_info "Created Python virtual environment."
    fi
    
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    log_success "Backend dependencies installed."
}

build_frontend() {
    log_info "Building frontend..."
    npm run build
    log_success "Frontend built successfully."
}

start_development() {
    log_info "Starting development servers..."
    
    # Start backend in background
    cd babylon-server
    source venv/bin/activate
    python src/main.py &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to start
    sleep 3
    
    # Check if backend is running
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
        log_success "Backend server started on port $BACKEND_PORT"
    else
        log_error "Failed to start backend server"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Start frontend
    log_info "Starting frontend server..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait a moment for frontend to start
    sleep 5
    
    # Check if frontend is running
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
        log_success "Frontend server started on port $FRONTEND_PORT"
    else
        log_error "Failed to start frontend server"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    
    log_success "Development servers are running!"
    log_info "Frontend: http://localhost:$FRONTEND_PORT"
    log_info "Backend API: http://localhost:$BACKEND_PORT"
    log_info "Admin Dashboard: http://localhost:$FRONTEND_PORT/admin"
    
    # Create cleanup function
    cleanup() {
        log_info "Stopping servers..."
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        log_success "Servers stopped."
    }
    
    # Set trap to cleanup on script exit
    trap cleanup EXIT
    
    # Wait for user to stop
    log_info "Press Ctrl+C to stop the servers."
    wait
}

deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    # Build and start containers
    docker-compose -f $DOCKER_COMPOSE_FILE build
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    if docker-compose -f $DOCKER_COMPOSE_FILE ps | grep -q "Up"; then
        log_success "Docker deployment completed successfully!"
        log_info "Services are running:"
        docker-compose -f $DOCKER_COMPOSE_FILE ps
    else
        log_error "Docker deployment failed. Check the logs:"
        docker-compose -f $DOCKER_COMPOSE_FILE logs
        exit 1
    fi
}

deploy_production() {
    log_info "Deploying for production..."
    
    # Build frontend
    build_frontend
    
    # Install production dependencies
    log_info "Installing production dependencies..."
    npm ci --only=production
    
    cd babylon-server
    source venv/bin/activate
    pip install -r requirements.txt
    
    # Install Gunicorn if not already installed
    pip install gunicorn
    cd ..
    
    log_success "Production deployment prepared."
    log_info "To start the production servers:"
    log_info "1. Backend: cd babylon-server && source venv/bin/activate && gunicorn -c gunicorn.conf.py src.main:app"
    log_info "2. Frontend: Serve the 'dist' directory with your web server (nginx, apache, etc.)"
}

show_help() {
    echo "Babylon.js Game Engine Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup       Setup the development environment"
    echo "  dev         Start development servers"
    echo "  build       Build the frontend for production"
    echo "  docker      Deploy using Docker Compose"
    echo "  production  Prepare for production deployment"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # Setup environment and install dependencies"
    echo "  $0 dev       # Start development servers"
    echo "  $0 docker    # Deploy with Docker"
}

# Main script logic
case "${1:-help}" in
    setup)
        check_dependencies
        setup_environment
        install_frontend_dependencies
        install_backend_dependencies
        log_success "Setup completed! Run '$0 dev' to start development servers."
        ;;
    dev)
        check_dependencies
        start_development
        ;;
    build)
        check_dependencies
        build_frontend
        ;;
    docker)
        deploy_docker
        ;;
    production)
        check_dependencies
        deploy_production
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

