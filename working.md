# Northstar Workbench

This file records what has been built in `app/`, how to run it, and how to continue developing it as a VS Code-style fork.

## What This App Is

Northstar is a React + Vite renderer inside an Electron Linux desktop shell. It is inspired by the `vscode-main` source tree, but it is not currently running the complete VS Code workbench or VS Code extension host. The current app is a smaller, independent workbench that can grow toward that architecture.

Current stack:

- React 19 for UI state and pages
- Vite 8 for renderer development and production builds
- Electron 39 for the Linux desktop window and main process
- Monaco Editor for editor syntax highlighting
- Electron `contextBridge` and IPC for native capabilities
- `electron-builder` for AppImage and Debian packages
- Fish at `/usr/bin/fish` for Linux terminal commands
- `adm-zip` for reading VSIX archives

## Current Files

```text
app/
├── electron/
│   ├── main.js       # BrowserWindow, workspace IPC, Fish commands, VSIX install
│   └── preload.cjs   # Small safe API exposed to the renderer
├── src/
│   ├── App.jsx       # Welcome, Explorer, editor, Search, Run, Extensions, Terminal
│   ├── App.css       # Workbench visual system
│   ├── index.css     # Fonts and global reset
│   └── main.jsx      # React entry point
├── vscode-main/      # Local Code - OSS source tree used as the workspace
├── package.json
├── package-lock.json
├── vite.config.js
└── working.md
```

## How To Run

Use the app root, not the `vscode-main` directory:

```fish
cd /media/system/56C63945C6392721/A.Project/vscode/app
npm install
npm run dev
```

`npm run dev` starts Vite and Electron together. The desktop window opens after Vite is available.

Useful commands:

```fish
npm run build       # Build the React renderer into dist/
npm run lint        # Run Oxlint
npm start           # Open Electron using the current production files
npm run dist:linux  # Build AppImage and .deb packages into dist/
npm run code        # Launch the built desktop app through scripts/code.sh
npm run code:web    # Serve the built app at http://127.0.0.1:4173
npm run code:both   # Serve the web app and launch the desktop app together
```

The same launchers can be run directly from the app root:

```fish
./scripts/code.sh
./scripts/code-web.sh
./scripts/code-both.sh
```

Each launcher builds automatically when `dist/index.html` is missing. `code.sh`
opens the production renderer in Electron. `code.web` starts Vite preview on
`http://127.0.0.1:4173`. `code-both.sh` starts that preview, waits for it to be
ready, then opens the same built renderer in Electron. Press `Ctrl+C` to stop
the launcher and its child process.

Run packaging on Linux to produce native Linux artifacts. The first packaging run may download Electron-builder tools.

## Native Process Boundary

The renderer must not receive Node.js or Electron directly. `electron/main.js` owns native work. `electron/preload.cjs` exposes only narrow functions:

```js
window.electronAPI.workspace.list(path)
window.electronAPI.workspace.read(path)
window.electronAPI.terminal.run(command)
window.electronAPI.extensions.list()
window.electronAPI.extensions.install()
```

The workspace path is fixed to `app/vscode-main`. The main process rejects paths outside that directory. Keep this rule when adding write, search, watch, or process APIs.

The current terminal API runs commands with:

```text
cwd = /media/system/56C63945C6392721/A.Project/vscode/app/vscode-main
shell = /usr/bin/fish on Linux
```

For a production terminal, replace one-shot `exec` with a long-lived PTY process. That is required for interactive programs, colors, shell history, Ctrl+C, and streaming output.

## Pages And UI Rules

The current activity bar provides these pages:

- Welcome: first screen and quick actions
- Explorer: workspace tree and file opening
- Search: search entry point
- Run and Debug: launch configuration entry point
- Extensions: installed extension cards and VSIX installation
- Editor: Monaco editor for the selected file
- Terminal: Fish command output

When adding a page, follow the same structure:

1. Add a page id and label to `navItems` in `src/App.jsx`.
2. Add one branch in `content()`.
3. Put page-specific markup in a small component such as `Welcome`, `Extensions`, or `Run`.
4. Add styles in `src/App.css` using the existing variables and dimensions.
5. Keep native work in `electron/main.js`, then expose only the needed method through `preload.cjs`.
6. Run `npm run lint && npm run build` before considering the page complete.

New pages should feel like the same application: dark editor surfaces, green workbench chrome, orange action accent, Space Grotesk for interface text, and DM Mono for paths, commands, and status labels. Do not create a separate visual language for each page. Use full-height workbench views, compact controls, clear active states, and responsive behavior below 700px.

The first page is the Welcome page. Keep it as the default for a new window. Later, add persisted state if the app should reopen the last workspace or editor tab.

## What `vscode-main` Does With Extensions

`vscode-main` is a full Code - OSS source tree. Its real extension system is substantially larger than the current lightweight app layer.

### Extension locations

Built-in source extensions are in:

```text
vscode-main/extensions/
```

Examples include `javascript`, `typescript-language-features`, `python`, `git`, `json`, `css`, and `theme-modern-icons`.

The full application also has built-in extension metadata in `vscode-main/product.json`. Its `builtInExtensions` array identifies extensions bundled with the product, including name, version, repository, checksum, and publisher metadata.

Installed user extensions are stored in the CodeMind home directory, separate from the source checkout: `app.getPath('home')/.codemind/extensions`. The extension registry is stored at `app.getPath('home')/.codemind/extensions.json`.

### Extension manifest

Every extension is described by `package.json`. The manifest can contain:

- `name`, `displayName`, `publisher`, `version`, and `description`
- `engines.vscode`, declaring API compatibility
- `activationEvents`, defining when the extension starts
- `main` or `browser`, defining the extension entry point
- `contributes`, declaring languages, grammars, commands, menus, themes, icons, settings, views, and more

The JavaScript extension is a useful language example. Its manifest contributes `languages` with ids and file extensions, then contributes TextMate `grammars` with a grammar path such as `./syntaxes/JavaScript.tmLanguage.json`.

The Git and TypeScript language feature extensions are useful activation examples because they declare activation events and contribute commands or language features.

### Full Code - OSS loading model

The full desktop workbench starts its extension infrastructure through:

```text
src/vs/workbench/workbench.desktop.main.ts
  -> services/extensions/electron-browser/extensionHostStarter.ts
```

The extension host communicates with the workbench through VS Code IPC and RPC protocols. Extensions run in an extension host, not directly in the renderer DOM. The workbench scans built-in and user extension directories, reads manifests, resolves contributions, and activates extensions when their activation events occur.

Do not copy the full extension host into the renderer. To move toward compatibility, implement an extension manager in the main process and a controlled RPC protocol. Treat extension code as untrusted application code.

## Current Extension Layer

The current app already does these things:

1. Lists extension manifests under `vscode-main/extensions`.
2. Lists manifests in Electron's user-data `extensions` directory.
3. Opens a file picker restricted to `.vsix` files.
4. Reads `extension/package.json` from the VSIX archive.
5. Extracts the archive into `/home/system/.codemind/extensions` (the portable form of `app.getPath('home')/.codemind/extensions`).
6. Shows extension name, publisher, version, and description in the Extensions page.

This is a manifest browser and installer foundation. It is not yet an extension host. A downloaded extension is not automatically executing commands, language servers, themes, or views yet.

## How To Add Real Extension Contributions

Use a normalized contribution pipeline in the main process:

```text
VSIX or built-in folder
  -> read package.json
  -> validate publisher/name/version/engines
  -> normalize contributes
  -> send safe metadata to React
  -> register supported contribution types
```

Start with low-risk contribution types:

1. `languages`: map file extensions to Monaco language ids.
2. `commands`: show command labels in a command palette.
3. `configuration`: store settings in a JSON settings file.
4. `iconThemes`: load file icon definitions and image paths.
5. `themes`: translate supported color keys into Monaco theme data.

Only after that should the app consider activating extension JavaScript. Activation needs a separate extension-host process, API compatibility checks, permissions, crash handling, and message validation.

For a manifest contribution, never pass arbitrary functions or Electron objects over `contextBridge`. Send plain JSON records only.

## File Icons And Material Icons

The repository's `theme-modern-icons` extension is the concrete icon example. Its manifest contains:

```json
{
  "contributes": {
    "iconThemes": [
      {
        "id": "vscode-modern-icons",
        "label": "%themeLabel%",
        "path": "./fileicons/vscode-modern-icons-icon-theme.json"
      }
    ]
  }
}
```

The referenced icon theme file contains `iconDefinitions`. For example, it maps logical ids to SVG files:

```json
{
  "iconDefinitions": {
    "_file": { "iconPath": "./images/file.svg" },
    "_folder": { "iconPath": "./images/folder.svg" },
    "_git": { "iconPath": "./images/git.svg" },
    "_javascript": { "iconPath": "./images/javascript.svg" }
  }
}
```

The rest of the theme file maps file extensions, filenames, and folder names to those definitions. The important implementation detail is that `iconPath` is relative to the icon theme JSON file, not relative to the app root.

To implement icons in this app:

1. Read `contributes.iconThemes` from every installed manifest.
2. Resolve the theme JSON path inside the extension directory.
3. Parse `iconDefinitions` and the extension, filename, and folder associations.
4. Return only normalized relative asset URLs from the main process.
5. In React, choose the most specific match in this order: exact filename, folder name, extension, default file/folder.
6. Render an `<img>` for SVG/PNG assets with a fixed 16px size.
7. Keep the current text fallback when an icon is missing.

Do not use arbitrary remote image URLs for file icons. Extension assets must be local, validated, and inside the installed extension directory.

If a separate Material Icons theme is added, it should follow the same `iconThemes` contract. The app should not hard-code a Material icon for every file type; it should load the theme's mapping data and use a default fallback. The existing `theme-modern-icons/fileicons/images/` directory is the source of the current SVG assets.

## Important Next Engineering Steps

- Fix VSIX installation layout normalization so extracted `extension/package.json` is found consistently by the manifest scanner.
- Add file writing and save support through a validated IPC method.
- Add file watching so Explorer updates after installs and source changes.
- Add icon theme parsing and pass icon matches into Explorer rows.
- Add Monaco language registration from extension `languages` contributions.
- Add a command palette backed by contributed commands.
- Replace one-shot Fish execution with a PTY and streamed output.
- Add a real extension host process only after the contribution model is stable.
- Add persisted settings for selected icon theme, color theme, and installed extensions.
- Add tests for path traversal, malformed VSIX files, manifest parsing, and extension activation boundaries.

## Validation Checklist

After a change:

```fish
npm run lint
npm run build
```

For a native package:

```fish
npm run dist:linux
```

Check manually that:

- Welcome opens first.
- Explorer expands folders and opens source files.
- Monaco uses the expected language mode.
- Terminal commands run from `vscode-main` using Fish.
- Extensions lists built-ins and installed manifests.
- A malformed or hostile VSIX is rejected.
- A path such as `../../etc/passwd` cannot escape the workspace.
- The layout remains usable on a narrow window.
