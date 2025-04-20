// Player module

/**
 * Creates the player character with physics properties
 * @param {THREE.Scene} scene - The scene to add the player to
 * @returns {Object} Player object with mesh and physics properties
 */
export function createPlayer(scene) {
    // Create player geometry
    const geometry = new THREE.SphereGeometry(10, 32, 32); // radius, widthSegments, heightSegments
    
    // Create face texture
    const texture = createFaceTexture();
    
    // Create material with face texture
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Physics properties
    const player = {
        mesh: mesh,
        radius: 10,
        mass: 1.0,
        momentOfInertia: 0,
        gravityScale: 15,
        coefficientOfFriction: 10,
        coefficientOfRestitution: 0.02,
        airResistanceCoefficient: 0.0015,
        groundResistanceCoefficient: 0.008,
        angularAirResistanceCoefficient: 0.04,
        inputTorqueMagnitude: 3000.0,
        jumpForce: 7000.0,
        isGrounded: false,
        type: 'circle', // For collision detection
        
        // State variables
        position: new THREE.Vector3(0, 0, 0),
        linearVelocity: new THREE.Vector3(0, 0, 0),
        angularVelocity: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        
        // Update function
        update: function(deltaTime, keys, ground) {
            this.updatePhysics(deltaTime, keys, ground);
            this.updateMesh();
        },
        
        // Physics update
        updatePhysics: function(deltaTime, keys, ground) {
            // Apply continuous forces/torques
            const forces = this.applyForces(keys, deltaTime);
            
            // Apply torque
            const inputTorque = this.applyTorque(keys);
            
            // Integrate motion
            this.integrateMotion(forces, inputTorque, deltaTime);
            
            // Handle collisions with ground
            this.handleGroundCollision(ground, deltaTime);
            
            // Handle collisions with obstacles
            if (ground.obstacles) {
                this.handleObstacleCollisions(ground.obstacles, deltaTime);
            }
        },
        
        // Apply forces
        applyForces: function(keys, deltaTime) {
            // Initialize with gravity
            const forces = new THREE.Vector3(0, -9.8 * this.gravityScale * this.mass, 0);
            
            // Air resistance
            const airResistance = this.linearVelocity.clone().multiplyScalar(
                -this.airResistanceCoefficient * this.linearVelocity.length()
            );
            forces.add(airResistance);
            
            // Ground resistance when grounded
            if (this.isGrounded) {
                const groundResistance = this.linearVelocity.clone().multiplyScalar(
                    -this.groundResistanceCoefficient * this.linearVelocity.length()
                );
                forces.add(groundResistance);
            }
            
            // Jump force
            if (keys.w && this.isGrounded) {
                forces.y += this.jumpForce * this.mass;
                this.isGrounded = false;
            }
            
            return forces;
        },
        
        // Apply torque
        applyTorque: function(keys) {
            const inputTorque = new THREE.Vector3(0, 0, 0);
            
            if (keys.a) inputTorque.z -= this.inputTorqueMagnitude;
            if (keys.d) inputTorque.z += this.inputTorqueMagnitude;
            
            // Apply air resistance to angular velocity when in the air
            if (!this.isGrounded) {
                const angularAirResistance = -this.angularAirResistanceCoefficient * 
                    this.angularVelocity.z * Math.abs(this.angularVelocity.z);
                inputTorque.z += angularAirResistance * this.momentOfInertia;
            }
            
            return inputTorque;
        },
        
        // Integrate motion
        integrateMotion: function(forces, inputTorque, deltaTime) {
            // Calculate accelerations
            const linearAcceleration = forces.clone().divideScalar(this.mass);
            const angularAcceleration = inputTorque.divideScalar(this.momentOfInertia);
            
            // Update velocities
            this.linearVelocity.add(linearAcceleration.multiplyScalar(deltaTime));
            this.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
            
            // Update rotation
            this.rotation.z -= this.angularVelocity.z * deltaTime;
            
            // Predict new position
            return this.position.clone().add(this.linearVelocity.clone().multiplyScalar(deltaTime));
        },
        
        // Handle collision with ground
        handleGroundCollision: function(ground, deltaTime) {
            // Get predicted position
            const predictedPosition = this.position.clone().add(
                this.linearVelocity.clone().multiplyScalar(deltaTime)
            );
            
            // Get terrain info at predicted position
            const terrainInfo = ground.getTerrainInfo(predictedPosition.x);
            const terrainHeight = terrainInfo.height;
            const terrainNormal = terrainInfo.normal;
            
            // Check for collision
            const playerBottom = predictedPosition.y - this.radius;
            const penetrationDepth = terrainHeight - playerBottom;
            
            // Reset grounded state
            this.isGrounded = false;
            
            if (penetrationDepth >= -1) {
                // Player is grounded
                this.isGrounded = true;
                
                // Resolve penetration
                const resolveVector = terrainNormal.clone().multiplyScalar(penetrationDepth);
                this.position.copy(predictedPosition).add(resolveVector);
                
                // Calculate tangent vector
                const tangentVector = new THREE.Vector3(-terrainNormal.y, terrainNormal.x, 0).normalize();
                
                // Calculate tangential speeds
                const currentTangentialSpeed = this.linearVelocity.dot(tangentVector);
                const desiredTangentialSpeed = -this.angularVelocity.z * this.radius;
                
                // Apply friction
                const speedDifference = desiredTangentialSpeed - currentTangentialSpeed;
                const frictionImpulse = speedDifference * this.coefficientOfFriction * deltaTime;
                
                // Apply correction to linear velocity
                this.linearVelocity.add(tangentVector.clone().multiplyScalar(frictionImpulse));
                
                // Adjust angular velocity
                const angularCorrection = -currentTangentialSpeed / this.radius - this.angularVelocity.z;
                const angularCorrectionStrength = 5.0;
                this.angularVelocity.z += angularCorrection * angularCorrectionStrength * deltaTime;
                
                // Apply normal impulse
                const normalVelocity = this.linearVelocity.dot(terrainNormal);
                if (normalVelocity < 0) {
                    const normalImpulse = -(1 + this.coefficientOfRestitution) * normalVelocity * this.mass;
                    this.linearVelocity.add(terrainNormal.clone().multiplyScalar(normalImpulse / this.mass));
                }
            } else {
                // No collision, use predicted position
                this.position.copy(predictedPosition);
            }
        },
        
        // Handle collisions with obstacles
        handleObstacleCollisions: function(obstacles, deltaTime) {
            // Get predicted position
            const predictedPosition = this.position.clone().add(
                this.linearVelocity.clone().multiplyScalar(deltaTime)
            );
            
            // Check for collisions with each obstacle
            obstacles.forEach(obstacle => {
                // Check if circle-box collision
                if (obstacle.type === 'box') {
                    // Find closest point on box to circle center
                    const closestX = Math.max(obstacle.position.x - obstacle.width/2, 
                                   Math.min(predictedPosition.x, obstacle.position.x + obstacle.width/2));
                    const closestY = Math.max(obstacle.position.y - obstacle.height/2, 
                                   Math.min(predictedPosition.y, obstacle.position.y + obstacle.height/2));
                    
                    // Calculate distance from closest point to circle center
                    const distanceX = predictedPosition.x - closestX;
                    const distanceY = predictedPosition.y - closestY;
                    const distanceSquared = distanceX * distanceX + distanceY * distanceY;
                    
                    // If collision detected
                    if (distanceSquared < (this.radius * this.radius)) {
                        // Calculate normal direction (from closest point to circle center)
                        const normal = new THREE.Vector3(distanceX, distanceY, 0);
                        normal.normalize();
                        
                        // Calculate penetration depth
                        const penetrationDepth = this.radius - Math.sqrt(distanceSquared);
                        
                        // Resolve penetration
                        const resolveVector = normal.clone().multiplyScalar(penetrationDepth);
                        this.position.copy(predictedPosition).add(resolveVector);
                        
                        // Check if this collision is on top of the obstacle
                        if (normal.y > 0.7) { // If normal is pointing mostly upward
                            this.isGrounded = true;
                        }
                        
                        // Apply normal impulse
                        const normalVelocity = this.linearVelocity.dot(normal);
                        if (normalVelocity < 0) {
                            const normalImpulse = -(1 + this.coefficientOfRestitution) * normalVelocity * this.mass;
                            this.linearVelocity.add(normal.clone().multiplyScalar(normalImpulse / this.mass));
                        }
                        
                        // Apply friction
                        if (this.isGrounded) {
                            // Calculate tangent vector
                            const tangent = new THREE.Vector3(-normal.y, normal.x, 0);
                            
                            // Calculate tangential speed
                            const tangentialVelocity = this.linearVelocity.dot(tangent);
                            
                            // Apply friction impulse
                            const frictionImpulse = tangentialVelocity * this.coefficientOfFriction * deltaTime;
                            this.linearVelocity.sub(tangent.multiplyScalar(frictionImpulse));
                        }
                    }
                }
            });
        },
        
        // Update mesh position and rotation
        updateMesh: function() {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }
    };
    
    // Calculate moment of inertia for a sphere
    player.momentOfInertia = (2/5) * player.mass * player.radius * player.radius;
    
    // Set initial position
    player.position.set(0, 100, 0); // Start above the terrain
    player.updateMesh();
    
    // Add to scene
    scene.add(player.mesh);
    
    return player;
}

/**
 * Creates a face texture for the player
 * @returns {THREE.CanvasTexture} The face texture
 */
function createFaceTexture() {
    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    // Draw face background
    context.fillStyle = '#535353';
    context.beginPath();
    context.arc(128, 128, 128, 0, Math.PI * 2);
    context.fill();

    // Draw eyes
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(90, 100, 15, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(166, 100, 15, 0, Math.PI * 2);
    context.fill();

    // Draw pupils
    context.fillStyle = 'black';
    context.beginPath();
    context.arc(90, 100, 7, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(166, 100, 7, 0, Math.PI * 2);
    context.fill();

    // Draw mouth
    context.strokeStyle = 'black';
    context.lineWidth = 8;
    context.beginPath();
    context.arc(128, 140, 30, 0, Math.PI);
    context.stroke();

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
} 