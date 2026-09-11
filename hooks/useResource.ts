"use client";
import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../services/errors";
export function useResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((x) => x + 1), []);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setLoading(true);
        setError("");
      }
    });
    loader()
      .then((data) => {
        if (active) setData(data);
      })
      .catch((e) => {
        if (active) {
          setData(undefined);
          setError(errorMessage(e));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loader, revision]);
  return { data, error, loading, reload };
}
