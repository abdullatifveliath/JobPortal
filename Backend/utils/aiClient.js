// Small helper to talk to the AI model (clod.io - OpenAI compatible API).
// Used by job recommendations (askAI) and the chatbot (chatAI).

// Send a full list of chat messages and get the model's reply text back.
export const chatAI = async (
  messages,
  // gpt-oss models "think" first and that counts towards maxTokens, so leave
  // plenty of room or the reply comes back empty
  { maxTokens = 2000, timeoutMs = 30000, temperature = 0.4 } = {}
) => {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error("AI config missing in .env (AI_BASE_URL / AI_API_KEY / AI_MODEL)");
  }

  // don't let a slow AI call hang the request
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
};

// One system + one user message, short answer, shorter timeout.
// Used by job recommendations (falls back to simple matching if this fails).
const askAI = (systemPrompt, userPrompt) =>
  chatAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { maxTokens: 1200, timeoutMs: 15000, temperature: 0.2 }
  );

export default askAI;
