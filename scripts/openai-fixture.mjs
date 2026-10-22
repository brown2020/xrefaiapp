/**
 * Local OpenAI Responses API stream for the emulator proofs. Emits the same
 * event sequence the real API sends so the AI SDK parses the text.
 * A request body containing EMPTY_REPLY gets a content-filtered response
 * with no text.
 */
const reply = "Local fixture reply.";

function event(payload) {
  return `event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`;
}

const usage = (outputTokens) => ({
  input_tokens: 5,
  input_tokens_details: { cached_tokens: 0 },
  output_tokens: outputTokens,
  output_tokens_details: { reasoning_tokens: 0 },
  total_tokens: 5 + outputTokens,
});

export function writeResponsesStream(res, requestBody) {
  if (!res.headersSent) {
    res.writeHead(200, { "content-type": "text/event-stream" });
  }
  const base = {
    id: "resp_fixture",
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    model: "gpt-5.4",
    status: "in_progress",
    output: [],
    usage: null,
    incomplete_details: null,
  };
  res.write(event({ type: "response.created", sequence_number: 0, response: base }));

  if (requestBody.includes("EMPTY_REPLY")) {
    res.write(
      event({
        type: "response.incomplete",
        sequence_number: 1,
        response: {
          ...base,
          status: "incomplete",
          incomplete_details: { reason: "content_filter" },
          usage: usage(0),
        },
      })
    );
    res.end();
    return;
  }

  const part = { type: "output_text", text: "", annotations: [] };
  const where = { item_id: "msg_1", output_index: 0, content_index: 0 };
  const message = { type: "message", id: "msg_1", role: "assistant" };
  res.write(
    event({
      type: "response.output_item.added",
      sequence_number: 1,
      output_index: 0,
      item: { ...message, status: "in_progress", content: [] },
    })
  );
  res.write(event({ type: "response.content_part.added", sequence_number: 2, ...where, part }));
  res.write(
    event({ type: "response.output_text.delta", sequence_number: 3, ...where, delta: reply, logprobs: [] })
  );
  res.write(
    event({ type: "response.output_text.done", sequence_number: 4, ...where, text: reply, logprobs: [] })
  );
  res.write(
    event({
      type: "response.content_part.done",
      sequence_number: 5,
      ...where,
      part: { ...part, text: reply },
    })
  );
  res.write(
    event({
      type: "response.output_item.done",
      sequence_number: 6,
      output_index: 0,
      item: { ...message, status: "completed", content: [{ ...part, text: reply }] },
    })
  );
  res.write(
    event({
      type: "response.completed",
      sequence_number: 7,
      response: { ...base, status: "completed", usage: usage(4) },
    })
  );
  res.end();
}
