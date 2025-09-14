class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartBtn = document.getElementById('restartBtn');
        this.mobileControls = document.getElementById('mobileControls');
        
        // Game settings
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // Game state
        this.snake = [
            {x: 10, y: 10}
        ];
        this.food = {};
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameLoop = null;
        
        // Colors with neon effects
        this.colors = {
            snake: '#00ffff',
            snakeGlow: '#00ffff',
            food: '#ff6b6b',
            foodGlow: '#ff6b6b',
            background: '#1a1a2e',
            grid: '#0a0a0a'
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.generateFood();
        this.startGame();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Mobile controls
        const controlBtns = document.querySelectorAll('.control-btn');
        controlBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const direction = e.target.getAttribute('data-direction');
                this.handleMobileControl(direction);
            });
        });
        
        // Restart button
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault());
    }
    
    handleKeyPress(e) {
        if (!this.gameRunning) return;
        
        const key = e.key.toLowerCase();
        
        // Pause/Resume with spacebar
        if (key === ' ') {
            e.preventDefault();
            this.togglePause();
            return;
        }
        
        // Prevent reverse direction
        const newDx = (key === 'arrowleft' || key === 'a') ? -1 : 
                     (key === 'arrowright' || key === 'd') ? 1 : this.dx;
        const newDy = (key === 'arrowup' || key === 'w') ? -1 : 
                     (key === 'arrowdown' || key === 's') ? 1 : this.dy;
        
        // Prevent snake from going backwards into itself
        if (newDx !== -this.dx || newDy !== -this.dy) {
            this.dx = newDx;
            this.dy = newDy;
        }
        
        e.preventDefault();
    }
    
    handleMobileControl(direction) {
        if (!this.gameRunning) return;
        
        const directions = {
            'up': {dx: 0, dy: -1},
            'down': {dx: 0, dy: 1},
            'left': {dx: -1, dy: 0},
            'right': {dx: 1, dy: 0}
        };
        
        const newDirection = directions[direction];
        if (newDirection && (newDirection.dx !== -this.dx || newDirection.dy !== -this.dy)) {
            this.dx = newDirection.dx;
            this.dy = newDirection.dy;
        }
    }
    
    handleTouch(e) {
        if (!this.gameRunning) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const deltaX = x - centerX;
        const deltaY = y - centerY;
        
        // Determine swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0 && this.dx !== -1) {
                this.dx = 1; // Right
                this.dy = 0;
            } else if (deltaX < 0 && this.dx !== 1) {
                this.dx = -1; // Left
                this.dy = 0;
            }
        } else {
            // Vertical swipe
            if (deltaY > 0 && this.dy !== -1) {
                this.dx = 0;
                this.dy = 1; // Down
            } else if (deltaY < 0 && this.dy !== 1) {
                this.dx = 0;
                this.dy = -1; // Up
            }
        }
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(400, container.clientWidth - 40);
        const maxHeight = Math.min(400, window.innerHeight * 0.6);
        const size = Math.min(maxWidth, maxHeight);
        
        this.canvas.width = size;
        this.canvas.height = size;
        this.tileCount = size / this.gridSize;
        
        // Regenerate food if it's outside new bounds
        if (this.food.x >= this.tileCount || this.food.y >= this.tileCount) {
            this.generateFood();
        }
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.gameLoop = setInterval(() => this.update(), 150);
    }
    
    togglePause() {
        this.gamePaused = !this.gamePaused;
        if (this.gamePaused) {
            clearInterval(this.gameLoop);
        } else {
            this.gameLoop = setInterval(() => this.update(), 150);
        }
    }
    
    update() {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.moveSnake();
        this.checkCollisions();
        this.checkFoodCollision();
        this.draw();
    }
    
    moveSnake() {
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
        this.snake.unshift(head);
        
        // Remove tail if no food eaten
        if (head.x !== this.food.x || head.y !== this.food.y) {
            this.snake.pop();
        } else {
            this.eatFood();
        }
    }
    
    checkCollisions() {
        const head = this.snake[0];
        
        // Wall collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.gameOver();
        }
        
        // Self collision
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.gameOver();
            }
        }
    }
    
    checkFoodCollision() {
        const head = this.snake[0];
        if (head.x === this.food.x && head.y === this.food.y) {
            this.eatFood();
        }
    }
    
    eatFood() {
        this.score += 10;
        this.scoreElement.textContent = this.score;
        this.generateFood();
        
        // Increase speed slightly
        clearInterval(this.gameLoop);
        const newSpeed = Math.max(100, 150 - (this.score / 50) * 10);
        this.gameLoop = setInterval(() => this.update(), newSpeed);
    }
    
    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw snake with neon effect
        this.drawSnake();
        
        // Draw food with neon effect
        this.drawFood();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 0.5;
        
        for (let i = 0; i <= this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            // Create gradient for neon effect
            const gradient = this.ctx.createRadialGradient(
                x + this.gridSize/2, y + this.gridSize/2, 0,
                x + this.gridSize/2, y + this.gridSize/2, this.gridSize/2
            );
            
            if (index === 0) {
                // Head - brighter
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, this.colors.snake);
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0.3)');
            } else {
                // Body
                gradient.addColorStop(0, this.colors.snake);
                gradient.addColorStop(0.7, this.colors.snake);
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0.3)');
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            
            // Add glow effect
            this.ctx.shadowColor = this.colors.snakeGlow;
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        
        // Create pulsing effect
        const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
        const size = (this.gridSize - 4) * pulse;
        const offset = (this.gridSize - size) / 2;
        
        // Create gradient for neon effect
        const gradient = this.ctx.createRadialGradient(
            x + this.gridSize/2, y + this.gridSize/2, 0,
            x + this.gridSize/2, y + this.gridSize/2, size/2
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, this.colors.food);
        gradient.addColorStop(1, 'rgba(255, 107, 107, 0.3)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize/2, y + this.gridSize/2, size/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add glow effect
        this.ctx.shadowColor = this.colors.foodGlow;
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize/2, y + this.gridSize/2, size/2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }
    
    gameOver() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);
        this.finalScoreElement.textContent = this.score;
        this.gameOverScreen.classList.add('show');
    }
    
    restartGame() {
        // Reset game state
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.scoreElement.textContent = this.score;
        this.gameOverScreen.classList.remove('show');
        
        // Regenerate food
        this.generateFood();
        
        // Restart game
        this.startGame();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});

// Prevent context menu on mobile
document.addEventListener('contextmenu', (e) => e.preventDefault());
