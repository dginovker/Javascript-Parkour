import { initRenderer, updateCamera } from './renderer.js';
import { createGround } from './terrain.js';
import { createPlayer } from './player.js';
import { setupInputHandlers } from './input.js';
import { createDebugDisplay } from './utils.js';
import { createObstacles, updateObstacles, findObstacleSurfaceAt } from './obstacles.js';

// Game state
const gameState = {
    player: null,
    scene: null,
    renderer: null,
    camera: null,
    ground: null,
    obstacles: [],
    keys: {
        a: false,
        d: false,
        w: false
    },
    debug: null,
    fpsCounter: {
        frameCount: 0,
        lastTime: 0,
        fps: 0,
        updateInterval: 500 // Update FPS every 500ms
    }
};

// Initialize game
function init() {
    // Initialize rendering
    const { scene, renderer, camera } = initRenderer();
    gameState.scene = scene;
    gameState.renderer = renderer;
    gameState.camera = camera;
    
    // Create terrain
    gameState.ground = createGround(scene);
    
    // Create obstacles
    gameState.obstacles = createObstacles(scene, gameState.ground);
    
    // Add obstacles to ground for collision detection
    gameState.ground.obstacles = gameState.obstacles;
    
    // Make findObstacleSurfaceAt globally available for the player physics
    window.require = function(path) {
        if (path === './obstacles.js') {
            return { findObstacleSurfaceAt };
        }
        throw new Error('Module not found: ' + path);
    };
    
    // Create player
    gameState.player = createPlayer(scene);
    
    // Setup input handlers
    setupInputHandlers(gameState.keys);
    
    // Create debug display
    gameState.debug = createDebugDisplay();
    
    // Start animation loop
    animate(0);
}

// Animation loop
let lastTime = 0;
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    // Calculate delta time
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    // Update FPS counter
    updateFPS(currentTime);
    
    if (gameState.player) {
        // Update player physics
        gameState.player.update(deltaTime, gameState.keys, gameState.ground);
        
        // Update obstacles if needed
        updateObstacles(gameState.obstacles, deltaTime);
        
        // Update debug info
        if (gameState.debug) {
            const terrainInfo = gameState.ground.getTerrainInfo(gameState.player.position.x);
            
            // Check for obstacle surface info
            const obstacleInfo = findObstacleSurfaceAt(
                gameState.obstacles, 
                gameState.player.position.x, 
                gameState.player.position.y,
                gameState.player.radius
            );
            
            // Determine current surface type and properties
            let surfaceType = "None";
            let surfaceNormal = "N/A";
            let collisionType = "None";
            
            if (gameState.player.currentSurface) {
                if (gameState.player.currentSurface === terrainInfo) {
                    surfaceType = "Terrain";
                } else {
                    surfaceType = "Obstacle";
                    if (gameState.player.currentSurface.isVertical) {
                        collisionType = "Side";
                    } else {
                        collisionType = gameState.player.currentSurface.normal.y > 0 ? "Top" : "Bottom";
                    }
                }
                
                const normal = gameState.player.currentSurface.normal;
                surfaceNormal = `(${normal.x.toFixed(2)}, ${normal.y.toFixed(2)})`;
            }
            
            gameState.debug.innerHTML = `
                FPS: ${gameState.fpsCounter.fps}<br>
                Position: (${gameState.player.position.x.toFixed(2)}, ${gameState.player.position.y.toFixed(2)})<br>
                Linear Velocity: (${gameState.player.linearVelocity.x.toFixed(2)}, ${gameState.player.linearVelocity.y.toFixed(2)})<br>
                Angular Velocity: (${gameState.player.angularVelocity.z.toFixed(2)})<br>
                Rotation: ${gameState.player.rotation.z.toFixed(2)}<br>
                Is Grounded: ${gameState.player.isGrounded}<br>
                Surface Type: ${surfaceType}<br>
                Surface Normal: ${surfaceNormal}<br>
                Collision Type: ${collisionType}<br>
                Keys: A=${gameState.keys.a}, D=${gameState.keys.d}, W=${gameState.keys.w}<br>
                Obstacles: ${gameState.obstacles.length}
            `;
        }
    }
    
    // Update window size if needed
    updateCamera(gameState.camera, gameState.renderer);
    
    // Render
    gameState.renderer.render(gameState.scene, gameState.camera);
}

// Update FPS counter
function updateFPS(currentTime) {
    // Increment frame count
    gameState.fpsCounter.frameCount++;
    
    // Check if we need to update the FPS value
    if (currentTime - gameState.fpsCounter.lastTime >= gameState.fpsCounter.updateInterval) {
        // Calculate FPS
        gameState.fpsCounter.fps = Math.round(
            (gameState.fpsCounter.frameCount * 1000) / 
            (currentTime - gameState.fpsCounter.lastTime)
        );
        
        // Reset counters
        gameState.fpsCounter.lastTime = currentTime;
        gameState.fpsCounter.frameCount = 0;
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    updateCamera(gameState.camera, gameState.renderer);
});

// Start the game when page loads
window.addEventListener('DOMContentLoaded', init); 