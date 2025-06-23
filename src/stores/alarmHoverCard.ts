import { create } from "zustand";

type HistoryItem = { value: number; timestamp: string };

type AlarmHoverCardState = {
  history: HistoryItem[];
  status: string;
  setHistory: (history: HistoryItem[]) => void;
  setStatus: (status: string) => void;
  reset: () => void;
};

export const useAlarmHoverCardStore = create<AlarmHoverCardState>((set) => ({
  history: [],
  status: "",
  setHistory: (history) => set({ history }),
  setStatus: (status) => set({ status }),
  reset: () => set({ history: [], status: "" }),
}));