// Obstacles module

/**
 * Creates parkour obstacles (boxes) and adds them to the scene
 * @param {THREE.Scene} scene - The scene to add obstacles to
 * @param {Object} ground - Ground object with terrain data
 * @returns {Array} Array of obstacle objects
 */
export function createObstacles(scene, ground) {
    const obstacles = [];
    
    // Create several platforms at different positions
    createPlatform(scene, obstacles, -300, ground.baseY + 120, 120, 20);
    createPlatform(scene, obstacles, -100, ground.baseY + 150, 80, 20);
    createPlatform(scene, obstacles, 100, ground.baseY + 180, 100, 20);
    createPlatform(scene, obstacles, 300, ground.baseY + 200, 60, 20);
    
    // Create some vertical obstacles (walls)
    createPlatform(scene, obstacles, -200, ground.baseY + 70, 20, 60);
    createPlatform(scene, obstacles, 200, ground.baseY + 90, 20, 100);
    
    // Create some stacked boxes for parkour jumping
    for (let i = 0; i < 3; i++) {
        createPlatform(scene, obstacles, -400 + i * 40, ground.baseY + 30 + i * 30, 30, 30);
    }
    
    // Create a staggered staircase
    for (let i = 0; i < 5; i++) {
        createPlatform(scene, obstacles, 400 + i * 50, ground.baseY + 30 + i * 25, 40, 20);
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
 */
function createPlatform(scene, obstacles, x, y, width, height) {
    // Create geometry and material
    const geometry = new THREE.BoxGeometry(width, height, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x333333 });
    
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
        type: 'box',
        
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