"use client";

import * as React from "react";

import type { ToastVariant } from "@/components/ui/toast";

type ToastId = string;

export type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
};

export type ToastState = ToastInput & {
  id: ToastId;
  open: boolean;
};

type Action =
  | { type: "ADD"; toast: ToastState }
  | { type: "DISMISS"; toastId?: ToastId }
  | { type: "REMOVE"; toastId?: ToastId };

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 800;

let memoryState: ToastState[] = [];
const listeners: Array<(state: ToastState[]) => void> = [];

function dispatch(action: Action) {
  switch (action.type) {
    case "ADD": {
      memoryState = [action.toast, ...memoryState].slice(0, TOAST_LIMIT);
      break;
    }
    case "DISMISS": {
      const toastId = action.toastId;
      memoryState = memoryState.map((t) => (toastId && t.id !== toastId ? t : { ...t, open: false }));
      break;
    }
    case "REMOVE": {
      const toastId = action.toastId;
      memoryState = toastId ? memoryState.filter((t) => t.id !== toastId) : [];
      break;
    }
    default: {
      break;
    }
  }
  for (const listener of listeners) listener(memoryState);
}

function genId(): ToastId {
  return crypto.randomUUID();
}

export function toast(input: ToastInput) {
  const id = genId();
  const toastState: ToastState = {
    id,
    open: true,
    title: input.title,
    description: input.description,
    variant: input.variant,
    duration: input.duration,
  };

  dispatch({ type: "ADD", toast: toastState });

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS", toastId: id }),
    update: (next: ToastInput) =>
      dispatch({
        type: "ADD",
        toast: { ...toastState, ...next, id, open: true },
      }),
  };
}

export function useToast() {
  const [state, setState] = React.useState<ToastState[]>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index >= 0) listeners.splice(index, 1);
    };
  }, []);

  const dismiss = React.useCallback((toastId?: ToastId) => dispatch({ type: "DISMISS", toastId }), []);

  const remove = React.useCallback((toastId?: ToastId) => dispatch({ type: "REMOVE", toastId }), []);

  return { toasts: state, toast, dismiss, remove };
}

export function scheduleToastRemoval(toastId: ToastId) {
  window.setTimeout(() => {
    dispatch({ type: "REMOVE", toastId });
  }, TOAST_REMOVE_DELAY);
}
