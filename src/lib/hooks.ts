"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api";
import { subscribeDB } from "./db";
import type { OpenHouseRequest, User } from "./types";

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True until the first result for the current inputs arrives (show skeletons). */
  loading: boolean;
  /** Re-run the fetcher without flashing the loading state. */
  refetch: () => void;
}

/**
 * Run an async fetcher whenever `key` changes. Data refetches silently after any
 * store mutation, so screens stay in sync without manual wiring.
 * `key` must capture every input the fetcher depends on (use primitives/JSON).
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  key: string | number | null,
  options: { enabled?: boolean; liveUpdates?: boolean } = {},
): AsyncState<T> {
  const { enabled = true, liveUpdates = true } = options;
  const fetcherRef = useRef(fetcher);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ key: string | number | null; data?: T; error?: Error }>({ key: "__none__" });

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled || !liveUpdates) return;
    return subscribeDB(() => setTick((t) => t + 1));
  }, [enabled, liveUpdates]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setResult({ key, data });
      },
      (err: unknown) => {
        if (!cancelled) setResult({ key, error: err instanceof Error ? err : new Error(String(err)) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, tick, enabled]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const settled = result.key === key;
  return {
    data: settled ? result.data : undefined,
    error: settled ? result.error : undefined,
    loading: enabled && !settled,
    refetch,
  };
}

/** One request. Pass viewerId (a host) to get distanceMiles. */
export function useRequest(id: string | undefined | null, viewerId?: string): AsyncState<OpenHouseRequest> {
  return useAsync(() => api.getRequest(id as string, viewerId), `req:${id}:${viewerId ?? ""}`, { enabled: !!id });
}

export function useRequests(filters: api.RequestFilters = {}): AsyncState<OpenHouseRequest[]> {
  return useAsync(() => api.listRequests(filters), `reqs:${JSON.stringify(filters)}`);
}

export function useUser(id: string | undefined | null): AsyncState<User> {
  return useAsync(() => api.getUser(id as string), `user:${id}`, { enabled: !!id });
}

export function useApplicants(requestId: string | undefined | null): AsyncState<api.ApplicantWithTrust[]> {
  return useAsync(() => api.listApplicantsWithTrust(requestId as string), `apps:${requestId}`, { enabled: !!requestId });
}

export function useNotifications(userId: string | undefined | null) {
  return useAsync(() => api.listNotifications(userId as string), `notes:${userId}`, { enabled: !!userId });
}

export interface MutationState<A extends unknown[], R> {
  /** Resolves with the result, or undefined if it failed (error is also stored). */
  mutate: (...args: A) => Promise<R | undefined>;
  loading: boolean;
  error: Error | undefined;
  data: R | undefined;
  reset: () => void;
}

export function useMutation<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options: { onSuccess?: (data: R) => void; onError?: (err: Error) => void } = {},
): MutationState<A, R> {
  const [state, setState] = useState<{ loading: boolean; error?: Error; data?: R }>({ loading: false });
  const fnRef = useRef(fn);
  const optRef = useRef(options);
  useEffect(() => {
    fnRef.current = fn;
    optRef.current = options;
  });
  const mutate = useCallback(async (...args: A) => {
    setState({ loading: true });
    try {
      const data = await fnRef.current(...args);
      setState({ loading: false, data });
      optRef.current.onSuccess?.(data);
      return data;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      setState({ loading: false, error });
      optRef.current.onError?.(error);
      return undefined;
    }
  }, []);
  const reset = useCallback(() => setState({ loading: false }), []);
  return { mutate, loading: state.loading, error: state.error, data: state.data, reset };
}
