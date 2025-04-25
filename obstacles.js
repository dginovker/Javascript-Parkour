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
                    obstacleConfig.id || `obstacle_${obstacles.length}`,
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
 * @param {string} id - Unique identifier for the obstacle
 * @param {number} x - X position of the platform center
 * @param {number} y - Y position of the platform center
 * @param {number} width - Width of the platform
 * @param {number} height - Height of the platform
 * @param {string} type - Type of obstacle (floor, platform, wall, etc.)
 */
function createPlatform(scene, obstacles, id, x, y, width, height, type = 'platform') {
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
    
    // Create text label with the obstacle ID
    // Don't add label to the main floor (id 0) since it would be too large
    if (id !== "0") {
        createTextLabel(scene, id, x, y, width, height);
    }
    
    // Create obstacle object with surface information
    const obstacle = {
        id: id,
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
            const contactDistanceSquared = contactDx * contactDx + contactDy * contactDy;
            const contactDistance = Math.sqrt(contactDistanceSquared);
            
            // Use a smaller tolerance to prevent stickiness (original was 1.0)
            const contactTolerance = 0.1; 
            
            // Check if we're colliding with appropriate tolerance
            if (contactDistance > playerRadius + contactTolerance) {
                return null;
            }
            
            // Calculate penetration depth
            const penetrationDepth = playerRadius - contactDistance;
            
            // Calculate normal vector
            let normal;
            if (contactDistance < 0.0001) {
                // If we're exactly at the center (extremely rare), just use a default up normal
                normal = new THREE.Vector3(0, 1, 0);
            } else {
                // Normalize the contact vector to get the normal
                normal = new THREE.Vector3(contactDx / contactDistance, contactDy / contactDistance, 0);
            }
            
            // Determine surface height based on the normal and penetration depth
            // This will work for any angle of surface
            const surfaceHeight = contactDistance;
            
            // Create generic surface info object
            return {
                height: surfaceHeight,
                normal: normal,
                penetrationDepth: penetrationDepth,
                isVertical: Math.abs(normal.x) > Math.abs(normal.y),
                allowGrounded: true, // Always allow grounding, physics will decide based on normal
                obstacleId: this.id
            };
        }
    };
    
    // Add to obstacles array
    obstacles.push(obstacle);
    
    return obstacle;
}

/**
 * Creates a text label for an obstacle
 * @param {THREE.Scene} scene - The scene to add the label to
 * @param {string} text - The text to display
 * @param {number} x - X position of the label
 * @param {number} y - Y position of the label
 * @param {number} width - Width of the parent obstacle
 * @param {number} height - Height of the parent obstacle
 * @returns {THREE.Object3D} The label object
 */
function createTextLabel(scene, text, x, y, width, height) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Use a much larger canvas for better resolution
    canvas.width = 256;
    canvas.height = 256;
    
    // Draw background
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = 'white';
    context.lineWidth = 8;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    // Set text style - much larger font size
    const fontSize = Math.min(canvas.width, canvas.height) * 0.7; // Use 70% of canvas size
    context.font = `bold ${fontSize}px Arial`;
    context.fillStyle = '#ffff00'; // Bright yellow for visibility
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Draw text
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite - make it larger than the obstacle for visibility
    const sprite = new THREE.Sprite(material);
    
    // Calculate scale - adjust this to make the label a good size
    // For small obstacles, use a minimum size to ensure visibility
    const minSize = 30; // Minimum size to ensure visibility
    const labelWidth = Math.max(minSize, width * 0.8);
    const labelHeight = Math.max(minSize, height * 0.8);
    
    sprite.scale.set(labelWidth, labelHeight, 1);
    
    // Place the label slightly above/in front of the obstacle
    sprite.position.set(x, y + height/2 + labelHeight/2, 2);
    
    // Add to scene
    scene.add(sprite);
    
    return sprite;
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
 * Find all surface collisions at a point considering all obstacles
 * @param {Array} obstacles - Array of all obstacles
 * @param {number} x - X coordinate to check
 * @param {number} y - Y coordinate to check
 * @param {number} radius - Radius of the player
 * @returns {Array|null} Array of objects with surface information or null if no surface found
 */
export function findObstacleSurfaceAt(obstacles, x, y, radius) {
    const collisions = [];
    
    for (const obstacle of obstacles) {
        // Get surface information for this obstacle
        const surfaceInfo = obstacle.getSurfaceInfo(x, y, radius);
        
        // If we have a collision, add it to our collision array
        if (surfaceInfo) {
            // Add a reference to the obstacle for debugging
            surfaceInfo.obstacleId = obstacle.id;
            collisions.push(surfaceInfo);
        }
    }
    
    // Sort collisions by penetration depth (deepest first)
    collisions.sort((a, b) => b.penetrationDepth - a.penetrationDepth);
    
    return collisions.length > 0 ? collisions : null;
} 