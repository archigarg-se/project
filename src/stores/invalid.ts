import { create } from "zustand";
type InvalidState = {
  invalidCount: number;
  setInvalidCount: (n: number) => void;
};
export const useInvalidStore = create<InvalidState>((set) => ({
  invalidCount: 0,
  setInvalidCount: (n) => set({ invalidCount: n }),
}));