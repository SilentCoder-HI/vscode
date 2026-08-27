# Electron React Linux App

## Structure

```text
app/
├── electron/
│   ├── main.js       # Electron main process
│   └── preload.cjs   # Isolated renderer bridge
├── src/
│   ├── App.jsx       # React application root
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

The renderer has no Node.js access. Native capabilities should be added as narrow
methods in `electron/preload.cjs`, then consumed through `window.electronAPI`.

## Commands

```bash
npm install
npm run dev        # Start Vite and Electron together
npm run build      # Build the React renderer
npm start          # Open the packaged renderer with Electron
npm run dist:linux # Create AppImage and .deb in dist/
```

Linux packaging targets `x64` by default and is configured for both AppImage and
Debian packages in `package.json`. Run the packaging command on Linux for a native
Linux artifact.
