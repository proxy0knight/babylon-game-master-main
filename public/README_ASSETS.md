# 3D Assets

Place your 3D model files here to use them in the playground.

## Supported Formats:
- `.babylon` - Babylon.js native format
- `.gltf/.glb` - GLTF/GLB models
- `.obj` - OBJ models (with .mtl files)

## Current Assets:
- `dude.babylon` - Character model (place your file here)

## Usage in Code:
```javascript
// Load a .babylon file
BABYLON.SceneLoader.ImportMesh("", "/", "dude.babylon", scene, function (meshes) {
    // Meshes loaded successfully
    var dude = meshes[0];
    dude.position.x = 0;
    dude.position.y = 0;
    dude.position.z = 0;
});

// Or use async/await
BABYLON.SceneLoader.ImportMeshAsync("", "/", "dude.babylon", scene).then((result) => {
    var dude = result.meshes[0];
    dude.position = new BABYLON.Vector3(0, 0, 0);
});
```
