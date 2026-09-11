"use client";
import { useState } from "react";
import { errorMessage } from "../services/errors";
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function run(
    action: () => Promise<void>,
    success = "Cambios guardados.",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, message, run };
}
