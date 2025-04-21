// Obstacles module

/**
 * Creates parkour obstacles (boxes) and adds them to the scene
 * @param {THREE.Scene} scene - The scene to add obstacles to
 * @param {Object} config - Configuration data from the JSON file
 * @returns {Array} Array of obstacle objects
 */
export async function createObstacles(scene, config) {
    if (!config) {
        // Load the configuration if not provided
        const response = await fetch('world-config.json');
        config = await response.json();
    }
    
    const obstacles = [];
    
    // Create obstacles from configuration
    for (const obstacleConfig of config.obstacles) {
        // Based on the obstacle type, create different kinds of platforms
        switch (obstacleConfig.type) {
            case 'floor':
            case 'platform':
            case 'wall':
            case 'stack':
            case 'stair':
                const obstacle = createPlatform(
                    scene, 
                    obstacles, 
                    obstacleConfig.x, 
                    obstacleConfig.y, 
                    obstacleConfig.width, 
                    obstacleConfig.height,
                    obstacleConfig.type
                );
                break;
            // Add other obstacle types here if needed
            default:
                console.warn(`Unknown obstacle type: ${obstacleConfig.type}`);
        }
    }
    
    return obstacles;
}

/**
 * Creates a single platform obstacle
 * @param {THREE.Scene} scene - The scene to add the platform to
 * @param {Array} obstacles - Array to add the new obstacle to
 * @param {number} x - X position of the platform center
 * @param {number} y - Y position of the platform center
 * @param {number} width - Width of the platform
 * @param {number} height - Height of the platform
 * @param {string} type - Type of obstacle (floor, platform, wall, etc.)
 */
function createPlatform(scene, obstacles, x, y, width, height, type = 'platform') {
    // Create geometry and material
    const geometry = new THREE.BoxGeometry(width, height, 1);
    
    // Use different colors for different obstacle types
    let color = 0x333333;
    if (type === 'floor') {
        color = 0x535353; // Use the same color as the old ground
    }
    
    const material = new THREE.MeshBasicMaterial({ color: color });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    
    // Add to scene
    scene.add(mesh);
    
    // Create obstacle object with surface information
    const obstacle = {
        mesh: mesh,
        position: mesh.position,
        width: width,
        height: height,
        type: type,
        
        // Surface information for player physics
        getSurfaceInfo: function(playerX, playerY, playerRadius) {
            // Calculate distance from player center to box center
            const dx = playerX - this.position.x;
            const dy = playerY - this.position.y;
            
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            
            // Find closest point on box surface to player center
            const closestX = Math.max(this.position.x - halfWidth, Math.min(playerX, this.position.x + halfWidth));
            const closestY = Math.max(this.position.y - halfHeight, Math.min(playerY, this.position.y + halfHeight));
            
            // Calculate vector from closest point to player center
            const contactDx = playerX - closestX;
            const contactDy = playerY - closestY;
            const distanceSquared = contactDx * contactDx + contactDy * contactDy;
            
            // Check if we're colliding or within the ground tolerance (1px)
            const groundTolerance = 1.0; // Match with player's groundTolerance
            if (distanceSquared > (playerRadius + groundTolerance) * (playerRadius + groundTolerance)) {
                return null;
            }
            
            // Calculate penetration depth
            const penetrationDepth = playerRadius - Math.sqrt(distanceSquared);
            
            // Determine which face of the box we're hitting
            let normal, surfaceHeight;
            
            // Determine if we're closer to a vertical or horizontal edge
            if (Math.abs(contactDx) > Math.abs(contactDy)) {
                // Horizontal collision (left or right)
                normal = new THREE.Vector3(Math.sign(contactDx), 0, 0);
                // Surface height is not applicable for side collisions, but we need a value
                surfaceHeight = playerY > this.position.y ? 
                    this.position.y + halfHeight + playerRadius : 
                    this.position.y - halfHeight - playerRadius;
            } else {
                // Vertical collision (top or bottom)
                normal = new THREE.Vector3(0, Math.sign(contactDy), 0);
                surfaceHeight = normal.y > 0 ? 
                    this.position.y + halfHeight : 
                    this.position.y - halfHeight;
            }
            
            return { 
                height: surfaceHeight, 
                normal: normal,
                penetrationDepth: penetrationDepth,
                isVertical: Math.abs(normal.x) > Math.abs(normal.y),
                allowGrounded: true // Allow grounding on all surfaces, player code will check normal.y
            };
        }
    };
    
    // Add to obstacles array
    obstacles.push(obstacle);
    
    return obstacle;
}

/**
 * Updates obstacles (if needed)
 * @param {Array} obstacles - Array of obstacles to update
 * @param {number} deltaTime - Time since last update
 */
export function updateObstacles(obstacles, deltaTime) {
    // This function can be used for moving platforms or other dynamic obstacle behavior
    // Currently, obstacles are static so no update is needed
}

/**
 * Find surface height and normal at a point considering all obstacles
 * @param {Array} obstacles - Array of all obstacles
 * @param {number} x - X coordinate to check
 * @param {number} y - Y coordinate to check
 * @param {number} radius - Radius of the player
 * @returns {Object|null} Object with surface information or null if no surface found
 */
export function findObstacleSurfaceAt(obstacles, x, y, radius) {
    let closestObstacle = null;
    let closestSurfaceInfo = null;
    let minDistance = Infinity;
    
    for (const obstacle of obstacles) {
        // Get surface information for this obstacle
        const surfaceInfo = obstacle.getSurfaceInfo(x, y, radius);
        
        // If we have a collision and it's closer than our previous closest
        if (surfaceInfo && surfaceInfo.penetrationDepth < minDistance) {
            minDistance = surfaceInfo.penetrationDepth;
            closestObstacle = obstacle;
            closestSurfaceInfo = surfaceInfo;
        }
    }
    
    return closestSurfaceInfo;
} 