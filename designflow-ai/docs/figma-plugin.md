# Installing the DesignFlow AI Figma plugin

This is a one-time setup, done once by whoever reviews designs in Figma. It
takes a few minutes and doesn't involve writing any code.

1. Open the **Figma desktop app** (not the browser version — plugin
   installation from a file needs the desktop app).
2. Open the SOC-MED file (or any file — the plugin works the same everywhere).
3. In the top menu, go to **Plugins → Development → Import plugin from
   manifest…**
4. A file picker opens. Select the `figma-plugin` folder from this project,
   then choose the `manifest.json` file inside it.
5. The plugin now shows up under **Plugins → Development → DesignFlow AI**.
   Run it from there any time.
6. The first time you run it, it'll ask for two things:
   - The website address (once the app is published — Claude will give you
     this)
   - A connection code, generated from **Settings → Figma plugin connection**
     inside the DesignFlow AI website (click "Generate token", copy it in)
7. After that, opening the plugin shows a list of submitted requests. Click
   **"Apply in Figma"** on one, and it duplicates the template and fills in
   everything the requester typed — right there on your canvas, ready for you
   to review and adjust.

You only need to do steps 1–6 once. After that, it's just: open Figma, open
the plugin, click Apply.
