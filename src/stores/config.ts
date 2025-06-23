import { create } from "zustand";

type Rule = { operator: string; value: number };
type Config = {
  [deviceId: string]: {
    [metric: string]: Rule;
  };
};

type ConfigState = {
  config: Config;
  showConfig: boolean;
  setConfig: (c: Config) => void;
  setShowConfig: (b: boolean) => void;
};

export const useConfigStore = create<ConfigState>((set) => ({
  config: {},
  showConfig: false,
  setConfig: (c) => set({ config: c }),
  setShowConfig: (b) => set({ showConfig: b }),
}));