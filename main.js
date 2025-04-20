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
    debug: null
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

// Handle window resize
window.addEventListener('resize', () => {
    updateCamera(gameState.camera, gameState.renderer);
});

// Start the game when page loads
window.addEventListener('DOMContentLoaded', init); 