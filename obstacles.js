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
    
    // Create obstacle object
    const obstacle = {
        mesh: mesh,
        position: mesh.position,
        width: width,
        height: height,
        type: 'box'
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