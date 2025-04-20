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
        coefficientOfRestitution: 0.3,
        airResistanceCoefficient: 0.001,
        groundResistanceCoefficient: 0.008,
        angularAirResistanceCoefficient: 0.04,
        inputTorqueMagnitude: 3000.0,
        airControlForce: 1200.0, // Force applied for air control
        airControlDistribution: 0.7, // 70% rotation, 30% linear movement when in air
        jumpForce: 7000.0,
        isGrounded: false,
        type: 'circle', // For collision detection
        currentSurface: null, // Reference to current surface player is on
        groundTolerance: 1.0, // Tolerance for ground detection - used for both terrain and obstacles
        
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
            
            // Apply torque and air control
            const inputTorque = this.applyTorque(keys);
            
            // Integrate motion
            this.integrateMotion(forces, inputTorque, deltaTime);
            
            // Handle collisions with all surfaces
            this.handleCollisions(ground, deltaTime);
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
            // Air control when not grounded
            else {
                // Calculate horizontal control force in the air
                const airControlX = this.calculateAirControl(keys);
                forces.add(airControlX);
            }
            
            // Jump force
            if (keys.w && this.isGrounded && this.currentSurface) {
                // Apply jump force in the normal direction
                const normal = this.currentSurface.normal;
                const jumpVector = normal.clone().multiplyScalar(this.jumpForce * this.mass);
                forces.add(jumpVector);
                this.isGrounded = false;
                this.currentSurface = null;
            }
            
            return forces;
        },
        
        // Calculate air control force
        calculateAirControl: function(keys) {
            let controlDirection = 0;
            
            if (keys.a) controlDirection -= 1;
            if (keys.d) controlDirection += 1;
            
            // Apply horizontal air control force
            if (controlDirection !== 0) {
                // This is the portion of input that goes to linear movement (1 - airControlDistribution)
                const linearControlFactor = 1 - this.airControlDistribution;
                return new THREE.Vector3(
                    controlDirection * this.airControlForce * linearControlFactor,
                    0,
                    0
                );
            }
            
            return new THREE.Vector3(0, 0, 0);
        },
        
        // Apply torque
        applyTorque: function(keys) {
            const inputTorque = new THREE.Vector3(0, 0, 0);
            
            let controlDirection = 0;
            if (keys.a) controlDirection -= 1;
            if (keys.d) controlDirection += 1;
            
            if (controlDirection !== 0) {
                // Adjust torque magnitude based on whether player is in air or not
                let torqueMagnitude = this.inputTorqueMagnitude;
                
                if (!this.isGrounded) {
                    // When in air, reduce the torque by the distribution factor
                    torqueMagnitude *= this.airControlDistribution;
                }
                
                inputTorque.z += controlDirection * torqueMagnitude;
            }
            
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
        
        // Handle collisions with all surfaces (terrain and obstacles)
        handleCollisions: function(ground, deltaTime) {
            // Get predicted position
            const predictedPosition = this.position.clone().add(
                this.linearVelocity.clone().multiplyScalar(deltaTime)
            );
            
            // Reset grounded state
            this.isGrounded = false;
            this.currentSurface = null;
            
            // Check collision with ground terrain
            const terrainInfo = ground.getTerrainInfo(predictedPosition.x);
            terrainInfo.isVertical = false; // Terrain is never vertical
            terrainInfo.allowGrounded = true; // Terrain always allows grounding
            
            // Add penetration depth to terrain info for consistent handling
            const playerBottom = predictedPosition.y - this.radius;
            terrainInfo.penetrationDepth = terrainInfo.height - playerBottom;
            
            // Check collision with obstacles
            let obstacleInfo = null;
            if (ground.obstacles) {
                const { findObstacleSurfaceAt } = window.require('./obstacles.js');
                obstacleInfo = findObstacleSurfaceAt(
                    ground.obstacles, 
                    predictedPosition.x, 
                    predictedPosition.y,
                    this.radius
                );
            }
            
            // First, handle obstacle collision if there is one
            let useTerrainCollision = true;
            
            if (obstacleInfo) {
                // Handle obstacle collision first
                const resolved = this.handleObstacleOrTerrainCollision(predictedPosition, obstacleInfo, deltaTime);
                
                // If we resolved a collision with an obstacle, don't handle terrain collision
                // unless player is below terrain level
                useTerrainCollision = !resolved || this.position.y - this.radius < terrainInfo.height;
            }
            
            // Handle collision with terrain if needed
            if (useTerrainCollision && terrainInfo.penetrationDepth >= -this.groundTolerance) {
                this.handleObstacleOrTerrainCollision(predictedPosition, terrainInfo, deltaTime);
            } else if (!this.isGrounded) {
                // No collision, use predicted position if not already modified by obstacle collision
                if (this.position.equals(this.position)) { // If position hasn't been changed
                    this.position.copy(predictedPosition);
                }
            }
        },
        
        // Handle collision with any surface (unified method for both terrain and obstacles)
        handleObstacleOrTerrainCollision: function(predictedPosition, surfaceInfo, deltaTime) {
            if (!surfaceInfo) return false;
            
            const normal = surfaceInfo.normal;
            
            // Resolve penetration
            const resolveVector = normal.clone().multiplyScalar(surfaceInfo.penetrationDepth);
            this.position.copy(predictedPosition).add(resolveVector);
            
            // Set grounded state only for top surfaces
            if (surfaceInfo.allowGrounded && normal.y > 0) {
                this.isGrounded = true;
                this.currentSurface = surfaceInfo;
                
                // Apply rolling physics for top surfaces
                this.applyRollingPhysics(normal, deltaTime);
            } else {
                // For side/bottom collisions, just bounce
                const normalVelocity = this.linearVelocity.dot(normal);
                
                if (normalVelocity < 0) {
                    // Only bounce if we're moving into the surface
                    const normalImpulse = -(1 + this.coefficientOfRestitution) * normalVelocity * this.mass;
                    this.linearVelocity.add(normal.clone().multiplyScalar(normalImpulse / this.mass));
                }
            }
            
            return true; // Collision was resolved
        },
        
        // Apply rolling physics (common for both terrain and obstacle top surfaces)
        applyRollingPhysics: function(surfaceNormal, deltaTime) {
            // Calculate tangent vector
            const tangentVector = new THREE.Vector3(-surfaceNormal.y, surfaceNormal.x, 0).normalize();
            
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
            const normalVelocity = this.linearVelocity.dot(surfaceNormal);
            if (normalVelocity < 0) {
                const normalImpulse = -(1 + this.coefficientOfRestitution) * normalVelocity * this.mass;
                this.linearVelocity.add(surfaceNormal.clone().multiplyScalar(normalImpulse / this.mass));
            }
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