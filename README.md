In-browser, 2d multiplayer parkour game, inspired by the Chrome no internet dinosaur game, where users are circular balls with a happy face so you can tell how they're spinning.

Note for AI: After implementing a feature, move it to the Existing features section.

Existing features:
1. Character is a simple ball with a happy face
2. Map is just one obstacle that you spawn on
3. Player can move with WASD, intacts with gravity, and does not pass through obstacles


To be implemented features:
4. Whether or not you need to interact with an obstacle is efficiently checked via geospatial hashing before calculating whether or not we hit the object
5. Enables multiplayer by syncing location with Ably (API key: `q7bPEw.9fpvwQ:MUr0kdXx7UgGbRPLEBKCdnMcAH-eBFQ2GrpFULH3P40`)
6. Uses geospatial hashing to determine which other users to view in multiplayer session
