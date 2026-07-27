import "server-only";

/**
 * Creates an Asana task for a new request. Guarded the same way as the
 * email notification — missing credentials log a warning and skip rather
 * than throwing, so a request can still succeed even before Asana is
 * connected.
 */
export async function createAsanaTask(params: { projectGid: string; title: string; notes: string }) {
  if (!process.env.ASANA_ACCESS_TOKEN) {
    console.warn("[asana] ASANA_ACCESS_TOKEN not set — skipping task creation.");
    return;
  }

  const res = await fetch("https://app.asana.com/api/1.0/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ASANA_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        name: params.title,
        notes: params.notes,
        projects: [params.projectGid],
      },
    }),
  });

  if (!res.ok) {
    console.error("[asana] Failed to create task:", await res.text());
  }
}
