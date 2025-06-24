import { create } from "zustand";

interface InvalidStore {
  count: number;
  fetchCount: () => Promise<void>;
}

export const useInvalidStore = create<InvalidStore>((set) => ({
  count: 0,
  fetchCount: async () => {
    try {
      const res = await fetch("/messages_log.csv");
      const text = await res.text();
      const now = Date.now();
      const lines = text.split("\n").filter(Boolean);
      let invalidCount = 0;
      for (const line of lines) {
        const cols = line.split(",");
        const timestamp = new Date(cols[0].trim()).getTime();
        const status = cols[6]?.trim();
        if (status === "invalid" && now - timestamp < 24 * 60 * 60 * 1000) {
          invalidCount++;
        }
      }
      set({ count: invalidCount });
    } catch {
      set({ count: 0 });
    }
  },
}));