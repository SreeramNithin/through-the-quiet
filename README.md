# Through the Quiet — Three.js edition

A browser-based third-person 3D experience built with Three.js and Vite.

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Run locally
1. Extract this folder.
2. Open a terminal in the project folder.
3. Run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite (usually http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview
```

## Controls
- W / A / S / D: move
- Arrow keys: move
- Shift: move faster
- Drag mouse: look around
- Space: pause / resume
- R: restart
- Begin again button: restart

## Notes
- Three.js is installed as a project dependency; Vite serves the app locally.
- The current character and environment are built from procedural 3D geometry. This keeps the project self-contained and avoids requiring external model downloads.
- For a photorealistic production version, replace the procedural traveller and creatures with licensed GLB/GLTF assets, then add Mixamo or custom skeletal animation clips. The scene is already structured to support GLTFLoader and AnimationMixer.
- The Google Fonts import is optional; the experience falls back to system fonts if unavailable.


## Publish a shareable link (players do NOT need Node.js)

### Easiest: Vercel (cloud build)
1. Create a GitHub repository in the browser.
2. Upload the contents of this project folder to that repository (not the ZIP file itself).
3. Sign in to https://vercel.com/ with GitHub and choose **Add New → Project**.
4. Import the repository. Vercel should detect Vite; if needed set:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
5. Select **Deploy**. Vercel installs dependencies and builds the site in the cloud.
6. Share the generated `*.vercel.app` URL.

### Alternative: Netlify
1. Push the project folder to GitHub.
2. Sign in at https://app.netlify.com/ and choose **Add new site → Import an existing project**.
3. Select the repository and deploy. `netlify.toml` contains the build settings.
4. Share the generated `*.netlify.app` URL.

The person opening the public URL only downloads the built browser assets. They do not install Node.js, npm, Vite or Three.js.
