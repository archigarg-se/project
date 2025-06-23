import { create } from "zustand";

type Config = {
  temperature: { operator: string; value: number };
  humidity: { operator: string; value: number };
};

type ConfigState = {
  config: Config;
  showConfig: boolean;
  setConfig: (config: Config) => void;
  setShowConfig: (show: boolean) => void;
};

export const useConfigStore = create<ConfigState>((set) => ({
  config: {
    temperature: { operator: ">", value: 70 },
    humidity: { operator: ">", value: 90 },
  },
  showConfig: false,
  setConfig: (config) => set({ config }),
  setShowConfig: (show) => set({ showConfig: show }),
}));