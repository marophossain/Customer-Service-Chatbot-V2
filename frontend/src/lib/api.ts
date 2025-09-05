const API_BASE = "http://localhost:8000";

export async function chat(sessionId: string, query: string) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      message: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function ingest(file: File) {
  try {
    console.log("Starting ingest for file:", file.name, "size:", file.size);

    const formData = new FormData();
    formData.append("file", file);

    console.log("Making request to:", `${API_BASE}/ingest`);

    const response = await fetch(`${API_BASE}/ingest`, {
      method: "POST",
      body: formData,
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Success response:", result);
    return result;
  } catch (error) {
    console.error("Ingest error:", error);
    throw error;
  }
}
