// Terrain module

/**
 * Creates the hilly ground for the game
 * @param {THREE.Scene} scene - The scene to add the ground to
 * @returns {Object} Ground object with mesh and points data
 */
export function createGround(scene) {
    // Ground parameters
    const groundBaseY = -window.innerHeight/2 + 30;
    const groundSegments = 20;
    const groundWidth = window.innerWidth;
    const segmentWidth = groundWidth / groundSegments;
    const maxHillHeight = 50;

    // Create ground shape
    const groundShape = new THREE.Shape();
    const groundPoints = [];
    groundShape.moveTo(-groundWidth/2, groundBaseY - 50); // Start below ground

    // Generate a hilly terrain using sine waves
    for (let i = 0; i <= groundSegments; i++) {
        const x = -groundWidth/2 + i * segmentWidth;
        // Use multiple sine waves with different frequencies for interesting terrain
        const y = groundBaseY + 
                Math.sin(i * 0.5) * maxHillHeight * 0.7 + 
                Math.sin(i * 0.2) * maxHillHeight * 0.3;
        groundShape.lineTo(x, y);
        groundPoints.push({x, y});
    }

    groundShape.lineTo(groundWidth/2, groundBaseY - 50); // End below ground
    groundShape.lineTo(-groundWidth/2, groundBaseY - 50); // Close the shape

    // Create ground mesh from shape
    const groundGeometry = new THREE.ShapeGeometry(groundShape);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x535353 });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    scene.add(groundMesh);

    // Return ground object with mesh and data
    return {
        mesh: groundMesh,
        points: groundPoints,
        baseY: groundBaseY,
        width: groundWidth,
        maxHeight: groundBaseY + maxHillHeight,
        getTerrainInfo: (x) => getTerrainInfo(x, groundPoints)
    };
}

/**
 * Helper function to find terrain height and normal at a given x position
 * @param {number} x - The x coordinate to check
 * @param {Array} groundPoints - Array of ground point coordinates
 * @returns {Object} Object with height and normal at the given x position
 */
function getTerrainInfo(x, groundPoints) {
    // Find which segment the player is over
    if (x < groundPoints[0].x) {
        return { height: groundPoints[0].y, normal: new THREE.Vector3(0, 1, 0) };
    }
    if (x > groundPoints[groundPoints.length - 1].x) {
        return { height: groundPoints[groundPoints.length - 1].y, normal: new THREE.Vector3(0, 1, 0) };
    }
    
    // Find the segment the player is over
    let segment = 0;
    for (let i = 0; i < groundPoints.length - 1; i++) {
        if (x >= groundPoints[i].x && x < groundPoints[i + 1].x) {
            segment = i;
            break;
        }
    }
    
    // Calculate height at x using linear interpolation
    const p1 = groundPoints[segment];
    const p2 = groundPoints[segment + 1];
    const t = (x - p1.x) / (p2.x - p1.x);
    const height = p1.y + t * (p2.y - p1.y);
    
    // Calculate normal (perpendicular to the segment)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const normal = new THREE.Vector3(-dy, dx, 0).normalize();
    
    return { height, normal };
} 