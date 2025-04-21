import { initRenderer, updateCamera } from './renderer.js';
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
    },
    cameraFollow: {
        smoothness: 0.1, // Lower values make camera more responsive, higher values make it smoother
        offset: { x: 0, y: 100 }, // Camera offset from player position
        bounds: { min: -Infinity, max: Infinity } // Camera bounds, can be set to limit how far the camera can move
    }
};

// Initialize game
async function init() {
    // Initialize rendering
    const { scene, renderer, camera } = initRenderer();
    gameState.scene = scene;
    gameState.renderer = renderer;
    gameState.camera = camera;
    
    // Load world configuration
    const response = await fetch('world-config.json');
    const config = await response.json();
    
    // Create obstacles using the config (including the floor)
    gameState.obstacles = await createObstacles(scene, config);
    
    // Expose the findObstacleSurfaceAt function globally for the player
    window.findObstacleSurfaceAt = findObstacleSurfaceAt;
    
    // Find floor obstacle for reference
    const floor = gameState.obstacles.find(obs => obs.type === 'floor');
    if (floor) {
        console.log("Floor object created successfully");
    }
    
    // Create player above the floor
    gameState.player = createPlayer(scene);
    
    // Position player above the floor
    if (floor) {
        gameState.player.position.y = floor.position.y + floor.height/2 + gameState.player.radius + 50;
    }
    
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
        gameState.player.update(deltaTime, gameState.keys, gameState.obstacles);
        
        // Update obstacles if needed
        updateObstacles(gameState.obstacles, deltaTime);
        
        // Update camera to follow player
        updateCameraPosition();
        
        // Update debug info
        if (gameState.debug) {
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
                surfaceType = "Obstacle";
                if (gameState.player.currentSurface.isVertical) {
                    collisionType = "Side";
                } else {
                    collisionType = gameState.player.currentSurface.normal.y > 0 ? "Top" : "Bottom";
                }
                
                const normal = gameState.player.currentSurface.normal;
                surfaceNormal = `(${normal.x.toFixed(2)}, ${normal.y.toFixed(2)})`;
            }
            
            // Format the air control distribution
            const airControlPct = Math.round(gameState.player.airControlDistribution * 100);
            const linearControlPct = 100 - airControlPct;
            
            gameState.debug.innerHTML = `
                FPS: ${gameState.fpsCounter.fps}<br>
                Position: (${gameState.player.position.x.toFixed(2)}, ${gameState.player.position.y.toFixed(2)})<br>
                Linear Velocity: (${gameState.player.linearVelocity.x.toFixed(2)}, ${gameState.player.linearVelocity.y.toFixed(2)})<br>
                Angular Velocity: (${gameState.player.angularVelocity.z.toFixed(2)})<br>
                Is Grounded: ${gameState.player.isGrounded}<br>
                Air Control: ${airControlPct}% rotation, ${linearControlPct}% linear<br>
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

// Update camera position to follow player
function updateCameraPosition() {
    const player = gameState.player;
    const camera = gameState.camera;
    const follow = gameState.cameraFollow;
    
    // Calculate target position
    const targetX = player.position.x + follow.offset.x;
    const targetY = player.position.y + follow.offset.y;
    
    // Apply bounds
    const boundedX = Math.max(follow.bounds.min, Math.min(follow.bounds.max, targetX));
    
    // Apply smoothing - linear interpolation between current and target position
    camera.position.x += (boundedX - camera.position.x) * follow.smoothness;
    camera.position.y += (targetY - camera.position.y) * follow.smoothness;
    
    // Update camera's projection matrix after position change
    camera.updateProjectionMatrix();
}

// Handle window resize
window.addEventListener('resize', () => {
    updateCamera(gameState.camera, gameState.renderer);
});

// Start the game when page loads
window.addEventListener('DOMContentLoaded', init); 