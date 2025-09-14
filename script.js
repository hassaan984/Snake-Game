class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartBtn = document.getElementById('restartBtn');
        this.mobileControls = document.getElementById('mobileControls');
        this.soundBtn = document.getElementById('soundBtn');
        this.soundIcon = this.soundBtn.querySelector('.sound-icon');
        
        // Game settings
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // Game state
        this.snake = [
            {x: 10, y: 10}
        ];
        this.food = {};
        this.dx = 0;
        this.dy = 1; // Start moving down in a straight line
        this.score = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameLoop = null;
        
        // Sound system
        this.audioContext = null;
        this.sounds = {};
        this.soundEnabled = true;
        this.userInteracted = false;
        this.backgroundMusicPlaying = false;
        
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
        this.initAudio();
        this.generateFood();
        this.startGame();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupEventListeners() {
        // Sound button
        this.soundBtn.addEventListener('click', () => this.toggleSound());
        
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
    
    // Audio System Methods
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }
    
    createSounds() {
        if (!this.audioContext) return;
        
        // Background music - simple looping melody
        this.sounds.backgroundMusic = this.createBackgroundMusic();
        
        // Food eating sound - short pop
        this.sounds.foodEat = this.createFoodSound();
        
        // Game over sound - descending tone
        this.sounds.gameOver = this.createGameOverSound();
    }
    
    createBackgroundMusic() {
        const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
        let currentNote = 0;
        let lastPlayTime = 0;
        
        return () => {
            if (!this.soundEnabled || !this.userInteracted) return;
            
            const now = this.audioContext.currentTime;
            if (now - lastPlayTime < 0.5) return; // Prevent overlapping
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(notes[currentNote], now);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
            
            oscillator.start(now);
            oscillator.stop(now + 0.4);
            
            currentNote = (currentNote + 1) % notes.length;
            lastPlayTime = now;
        };
    }
    
    createFoodSound() {
        return () => {
            if (!this.soundEnabled || !this.userInteracted) return;
            
            const now = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            
            oscillator.start(now);
            oscillator.stop(now + 0.2);
        };
    }
    
    createGameOverSound() {
        return () => {
            if (!this.soundEnabled || !this.userInteracted) return;
            
            const now = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 1);
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
            
            oscillator.start(now);
            oscillator.stop(now + 1);
        };
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.soundBtn.classList.toggle('muted', !this.soundEnabled);
        this.soundIcon.textContent = this.soundEnabled ? '🔊' : '🔇';
        
        if (!this.soundEnabled && this.backgroundMusicPlaying) {
            this.stopBackgroundMusic();
        } else if (this.soundEnabled && this.gameRunning && this.userInteracted) {
            this.startBackgroundMusic();
        }
    }
    
    startBackgroundMusic() {
        if (!this.soundEnabled || !this.userInteracted || this.backgroundMusicPlaying) return;
        
        this.backgroundMusicPlaying = true;
        this.playBackgroundMusic();
    }
    
    stopBackgroundMusic() {
        this.backgroundMusicPlaying = false;
    }
    
    playBackgroundMusic() {
        if (!this.backgroundMusicPlaying || !this.soundEnabled) return;
        
        this.sounds.backgroundMusic();
        setTimeout(() => this.playBackgroundMusic(), 500);
    }
    
    playSound(soundName) {
        if (!this.soundEnabled || !this.userInteracted || !this.sounds[soundName]) return;
        this.sounds[soundName]();
    }

    handleKeyPress(e) {
        // Mark user interaction for audio
        if (!this.userInteracted) {
            this.userInteracted = true;
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }
        
        if (!this.gameRunning) return;
        
        const key = e.key.toLowerCase();
        
        // Pause/Resume with spacebar
        if (key === ' ') {
            e.preventDefault();
            this.togglePause();
            return;
        }
        
        // Handle movement - only one axis at a time
        if (key === 'arrowleft' || key === 'a') {
            // Only allow left if not currently moving right
            if (this.dx !== 1) {
                this.dx = -1;
                this.dy = 0;
            }
        } else if (key === 'arrowright' || key === 'd') {
            // Only allow right if not currently moving left
            if (this.dx !== -1) {
                this.dx = 1;
                this.dy = 0;
            }
        } else if (key === 'arrowup' || key === 'w') {
            // Only allow up if not currently moving down
            if (this.dy !== 1) {
                this.dx = 0;
                this.dy = -1;
            }
        } else if (key === 'arrowdown' || key === 's') {
            // Only allow down if not currently moving up
            if (this.dy !== -1) {
                this.dx = 0;
                this.dy = 1;
            }
        }
        
        e.preventDefault();
    }
    
    handleMobileControl(direction) {
        // Mark user interaction for audio
        if (!this.userInteracted) {
            this.userInteracted = true;
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }
        
        if (!this.gameRunning) return;
        
        // Handle movement - only one axis at a time
        if (direction === 'left') {
            // Only allow left if not currently moving right
            if (this.dx !== 1) {
                this.dx = -1;
                this.dy = 0;
            }
        } else if (direction === 'right') {
            // Only allow right if not currently moving left
            if (this.dx !== -1) {
                this.dx = 1;
                this.dy = 0;
            }
        } else if (direction === 'up') {
            // Only allow up if not currently moving down
            if (this.dy !== 1) {
                this.dx = 0;
                this.dy = -1;
            }
        } else if (direction === 'down') {
            // Only allow down if not currently moving up
            if (this.dy !== -1) {
                this.dx = 0;
                this.dy = 1;
            }
        }
    }
    
    handleTouch(e) {
        // Mark user interaction for audio
        if (!this.userInteracted) {
            this.userInteracted = true;
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }
        
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
        
        // Determine swipe direction - only one axis at a time
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
        
        // Start background music if user has interacted
        if (this.userInteracted) {
            this.startBackgroundMusic();
        }
    }
    
    togglePause() {
        this.gamePaused = !this.gamePaused;
        if (this.gamePaused) {
            clearInterval(this.gameLoop);
            this.stopBackgroundMusic();
        } else {
            this.gameLoop = setInterval(() => this.update(), 150);
            if (this.userInteracted) {
                this.startBackgroundMusic();
            }
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
        
        // Play food eating sound
        this.playSound('foodEat');
        
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
        this.stopBackgroundMusic();
        this.finalScoreElement.textContent = this.score;
        this.gameOverScreen.classList.add('show');
        
        // Play game over sound
        this.playSound('gameOver');
    }
    
    restartGame() {
        // Reset game state
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 1; // Start moving down in a straight line
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