# Physics System Documentation

## Overview
The game implements a 2D physics system for a spherical player character interacting with a hilly terrain. The system uses Three.js for rendering and implements custom physics calculations for realistic movement and collisions.

## Core Components

### Scene Setup
- Orthographic camera for 2D view
- Custom hilly terrain using THREE.Shape
- Player represented as a sphere mesh
- Debug display for physics information

### Player Properties
```javascript
{
    mass: 1.0,
    radius: 10,
    momentOfInertia: (2/5) * mass * radius²,
    gravityScale: 15,
    coefficientOfFriction: 0.8,
    coefficientOfRestitution: 0.02,
    airResistanceCoefficient: 0.04,
    inputTorqueMagnitude: 3500.0,
    rollingSensitivity: 1.0
}
```

### Terrain Generation
- Generated using multiple sine waves for natural-looking hills
- Configurable parameters:
  - `groundBaseY`: Base height of terrain
  - `groundSegments`: Number of terrain segments
  - `groundWidth`: Total width of terrain
  - `maxHillHeight`: Maximum height of hills

## Physics Implementation

### State Variables
- **Position (Vector3):** Center of mass
- **Linear Velocity (Vector3):** Current movement speed
- **Angular Velocity (Vector3):** Current rotation speed
- **Rotation (Euler):** Current orientation

### Forces and Motion

1. **Continuous Forces**
   - Gravity: `mass * gravityScale * -9.8`
   - Air Resistance: `-airResistanceCoefficient * velocity * |velocity|`
   - Input Torque: Applied based on A/D keys

2. **Motion Integration**
   ```javascript
   // Linear motion
   acceleration = net_force / mass
   velocity += acceleration * deltaTime
   position += velocity * deltaTime

   // Angular motion
   angularAcceleration = net_torque / momentOfInertia
   angularVelocity += angularAcceleration * deltaTime
   rotation += angularVelocity * deltaTime
   ```

### Collision System

1. **Terrain Height Calculation**
   - Uses linear interpolation between terrain points
   - Calculates surface normal at any x position
   - Returns height and normal vector

2. **Collision Detection**
   - Checks if player's bottom (position.y - radius) penetrates terrain
   - Calculates penetration depth
   - Determines collision normal from terrain

3. **Collision Response**
   - Resolves penetration by moving player along normal
   - Applies normal impulse for bounce
   - Converts angular velocity to linear velocity for rolling
   - Applies friction to slow rotation

### Rolling Mechanics
- Angular velocity converted to linear velocity based on:
  - Current rotation speed
  - Player radius
  - Rolling sensitivity
- Linear velocity aligned with terrain surface
- Friction applied to angular velocity

## Controls
- **A:** Rotate counterclockwise (roll right)
- **D:** Rotate clockwise (roll left)

## Debug Information
Displays:
- Position coordinates
- Linear velocity components
- Angular velocity
- Current rotation
- Terrain height at position
- Terrain normal vector
- Key states

## Notes
- The system naturally handles slopes through terrain normal calculations
- Rolling emerges from the conversion of angular to linear velocity
- Air resistance and friction provide realistic motion damping
- The debug display helps in tuning physics parameters