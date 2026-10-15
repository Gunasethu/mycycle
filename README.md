# VELO / Garage

A game-inspired bicycle garage page with an interactive Three.js viewer.

## Preview

Install the project dependency once with `npm install`, then run `python3 -m http.server 4173` from this folder and open <http://localhost:4173>.

## Model asset

The FBX model and its supplied textures are in `assets/model/`. The original FBX is about 118 MB, so its first load can take a while. The browser preview uses the model directly through Three.js `FBXLoader`; no Blender installation is needed. A lighter web-ready export would improve production loading time.

## Interactions

- Drag the bike to orbit around it; scroll to zoom.
- Click a hotspot or a component card to open the part inspector.
- Use the orbit button to toggle slow automatic rotation.
- Ride figures are sample values.
