const NETWORK_ERROR_MESSAGE =
  "We couldn't reach the server. Please try again.";
const REQUEST_ERROR_MESSAGE =
  "We couldn't complete that request. Please try again.";

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {unknown} [detail]
   */
  constructor(message, status, detail = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Sends a request to the API and parses its JSON response.
 *
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(path, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail;
      try {
        const body = await response.json();
        detail = body?.detail;
      } catch {
        detail = undefined;
      }

      throw new ApiError(REQUEST_ERROR_MESSAGE, response.status, detail);
    }

    try {
      return await response.json();
    } catch {
      if (controller.signal.aborted) {
        throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
      }

      throw new ApiError(
        "We couldn't read the server's response. Please try again.",
        response.status,
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Creates a participant without collecting identifying details.
 *
 * @param {number | null} age Participant's age, or null if not provided.
 * @returns {Promise<{ id: string, code: string }>} The participant ID and code.
 */
export function createParticipant(age) {
  return request("/api/participants", {
    method: "POST",
    body: JSON.stringify({ age }),
  });
}

/**
 * Submits the finished test results for a participant.
 *
 * @param {string} participantId The participant's ID.
 * @param {Record<string, object>} results Per-game metrics.
 * @returns {Promise<{ id: string, score: number, category: "vulnerable" | "high risk" | "moderate risk" | "low risk" | "healthy", game_scores: Record<string, number> }>} The overall and per-game scores.
 */
export function submitSession(participantId, results) {
  return request("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ participant_id: participantId, results }),
  });
}

/**
 * Retrieves one session's result.
 *
 * @param {string} id The session ID.
 * @returns {Promise<{ id: string, score: number, category: "vulnerable" | "high risk" | "moderate risk" | "low risk" | "healthy", game_scores: Record<string, number> }>} The session's overall and per-game scores.
 */
export function getSession(id) {
  return request(`/api/sessions/${encodeURIComponent(id)}`);
}

/**
 * Retrieves a participant's sessions, newest first.
 *
 * @param {string} participantId The participant's ID.
 * @returns {Promise<Array<{ id: string, score: number, category: "vulnerable" | "high risk" | "moderate risk" | "low risk" | "healthy", game_scores: Record<string, number> }>>} The participant's session results.
 */
export function getParticipantSessions(participantId) {
  return request(
    `/api/participants/${encodeURIComponent(participantId)}/sessions`,
  );
}