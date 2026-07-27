// Runs in Figma's plugin sandbox (has access to the `figma` global, unlike ui.html).
// See docs/figma-plugin.md for the plain-language install steps.

figma.showUI(__html__, { width: 360, height: 480 });

figma.clientStorage.getAsync("settings").then((settings) => {
  figma.ui.postMessage({ type: "settings", settings: settings ?? null });
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === "save-settings") {
    await figma.clientStorage.setAsync("settings", msg.settings);
    figma.ui.postMessage({ type: "settings-saved" });
    return;
  }

  if (msg.type === "fetch-pending") {
    try {
      const res = await fetch(`${msg.apiBaseUrl}/api/plugin/pending`, {
        headers: { Authorization: `Bearer ${msg.token}` },
      });
      const data = await res.json();
      figma.ui.postMessage({ type: "pending-list", requests: data.requests ?? [], error: res.ok ? null : data.error });
    } catch (err) {
      figma.ui.postMessage({ type: "pending-list", requests: [], error: String(err) });
    }
    return;
  }

  if (msg.type === "apply-request") {
    try {
      const newNodeId = await applyRequest(msg.request);
      await fetch(`${msg.apiBaseUrl}/api/plugin/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${msg.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: msg.request.id, newFigmaNodeId: newNodeId }),
      });
      figma.ui.postMessage({ type: "apply-complete", requestId: msg.request.id });
    } catch (err) {
      figma.ui.postMessage({ type: "apply-error", requestId: msg.request.id, error: String(err) });
    }
  }
};

/**
 * Duplicates the request's template frame and fills in every text/image
 * slot by matching on layer name (see the TemplateSlot comment in
 * prisma/schema.prisma for why name, not node id).
 */
async function applyRequest(request) {
  const templateNode = await figma.getNodeByIdAsync(request.templateNodeId);
  if (!templateNode || !("clone" in templateNode)) {
    throw new Error("Could not find the template frame in this file.");
  }

  const clone = templateNode.clone();
  clone.name = `${request.name} — ${new Date().toLocaleDateString()}`;
  // Place the new copy just to the right of the original template so it's
  // easy to spot, rather than stacked exactly on top of it.
  clone.x = templateNode.x + templateNode.width + 200;
  clone.y = templateNode.y;
  figma.currentPage.appendChild(clone);

  for (const slide of request.slides) {
    for (const field of slide.fields) {
      if (!field.value) continue;
      const target = clone.findOne((n) => n.name === field.layerName);
      if (!target) continue;

      if (field.slotType === "TEXT" && target.type === "TEXT") {
        await figma.loadFontAsync(target.fontName);
        target.characters = field.value;
      }

      if (field.slotType === "IMAGE" && "fills" in target) {
        const bytes = await fetchImageBytes(field.value);
        const image = figma.createImage(bytes);
        target.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
      }
    }
  }

  figma.viewport.scrollAndZoomIntoView([clone]);
  return clone.id;
}

async function fetchImageBytes(url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}
