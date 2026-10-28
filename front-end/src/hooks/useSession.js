import { useRef, useState } from "react";
import { ApiError, createParticipant, submitSession } from "../api.js";

const PARTICIPANT_ID_KEY = "mindwell.participantId";
let memoryParticipantId = null;

function readParticipantId() {
  try {
    const storedId = window.localStorage.getItem(PARTICIPANT_ID_KEY);
    if (storedId) {
      memoryParticipantId = storedId;
      return storedId;
    }
    return memoryParticipantId;
  } catch {
    return memoryParticipantId;
  }
}

function writeParticipantId(id) {
  memoryParticipantId = id;
  try {
    window.localStorage.setItem(PARTICIPANT_ID_KEY, id);
  } catch {
    // Keep the ID in memory if local storage is unavailable.
  }
}

/**
 * Collects assessment results and submits them for the current participant.
 *
 * @returns {{
 *   results: Record<string, object>,
 *   recordResult: (gameId: string, metrics: object) => void,
 *   shared: Record<string, any>,
 *   setShared: (key: string, value: any) => void,
 *   submit: () => Promise<object | undefined>,
 *   status: "idle" | "submitting" | "done" | "error",
 *   error: string | null,
 *   reset: () => void
 * }} Session state and controls.
 */
export function useSession() {
  const [results, setResults] = useState({});
  const [shared, setSharedState] = useState({});
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const resultsRef = useRef(results);
  const participantIdRef = useRef(readParticipantId());
  const submissionInProgressRef = useRef(false);
  const generationRef = useRef(0);

  function recordResult(gameId, metrics) {
    resultsRef.current = { ...resultsRef.current, [gameId]: metrics };
    setResults((currentResults) => ({
      ...currentResults,
      [gameId]: metrics,
    }));
  }

  function setShared(key, value) {
    setSharedState((currentShared) => ({
      ...currentShared,
      [key]: value,
    }));
  }

  async function submit() {
    if (submissionInProgressRef.current) {
      return undefined;
    }

    submissionInProgressRef.current = true;
    const generation = generationRef.current;
    setStatus("submitting");
    setError(null);

    try {
      let participantId = participantIdRef.current;
      if (!participantId) {
        const participant = await createParticipant(null);
        participantId = participant.id;
        participantIdRef.current = participantId;
        writeParticipantId(participantId);
      }

      const response = await submitSession(participantId, resultsRef.current);
      if (generationRef.current === generation) {
        setStatus("done");
      }
      return response;
    } catch (caughtError) {
      if (generationRef.current === generation) {
        setStatus("error");
        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : "Something went wrong. Please try again.",
        );
      }
      throw caughtError;
    } finally {
      submissionInProgressRef.current = false;
    }
  }

  function reset() {
    generationRef.current += 1;
    resultsRef.current = {};
    setResults({});
    setSharedState({});
    setStatus("idle");
    setError(null);
  }

  return {
    results,
    recordResult,
    shared,
    setShared,
    submit,
    status,
    error,
    reset,
  };
}