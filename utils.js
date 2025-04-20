// Utils module

/**
 * Creates a debug display element
 * @returns {HTMLElement} The debug display element
 */
export function createDebugDisplay() {
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.color = 'black';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    debugDiv.style.padding = '10px';
    document.body.appendChild(debugDiv);
    
    return debugDiv;
}

/**
 * Check if two objects are colliding (AABB collision)
 * @param {Object} obj1 - First object with position and size
 * @param {Object} obj2 - Second object with position and size
 * @returns {boolean} True if objects are colliding
 */
export function checkCollision(obj1, obj2) {
    // For box-box collision
    if (obj1.type === 'box' && obj2.type === 'box') {
        return (
            obj1.position.x - obj1.width/2 < obj2.position.x + obj2.width/2 &&
            obj1.position.x + obj1.width/2 > obj2.position.x - obj2.width/2 &&
            obj1.position.y - obj1.height/2 < obj2.position.y + obj2.height/2 &&
            obj1.position.y + obj1.height/2 > obj2.position.y - obj2.height/2
        );
    }
    
    // For circle-box collision
    if ((obj1.type === 'circle' && obj2.type === 'box') || 
        (obj1.type === 'box' && obj2.type === 'circle')) {
        const circle = obj1.type === 'circle' ? obj1 : obj2;
        const box = obj1.type === 'box' ? obj1 : obj2;
        
        // Find closest point on box to circle center
        const closestX = Math.max(box.position.x - box.width/2, 
                          Math.min(circle.position.x, box.position.x + box.width/2));
        const closestY = Math.max(box.position.y - box.height/2, 
                          Math.min(circle.position.y, box.position.y + box.height/2));
        
        // Calculate distance from closest point to circle center
        const distanceX = circle.position.x - closestX;
        const distanceY = circle.position.y - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        return distanceSquared < (circle.radius * circle.radius);
    }
    
    // For circle-circle collision
    if (obj1.type === 'circle' && obj2.type === 'circle') {
        const dx = obj1.position.x - obj2.position.x;
        const dy = obj1.position.y - obj2.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < obj1.radius + obj2.radius;
    }
    
    return false;
} 