import { create } from "zustand";

type UIState = {
  showForm: boolean;
  setShowForm: (b: boolean) => void;
  modalAlarm: any;
  setModalAlarm: (a: any) => void;
  modalVisible: boolean;
  setModalVisible: (b: boolean) => void;
  selectedDevice: string;
  setSelectedDevice: (d: string) => void;
};

export const useUIStore = create<UIState>((set) => ({
  showForm: false,
  setShowForm: (b) => set({ showForm: b }),
  modalAlarm: null,
  setModalAlarm: (a) => set({ modalAlarm: a }),
  modalVisible: false,
  setModalVisible: (b) => set({ modalVisible: b }),
  selectedDevice: "device-1",
  setSelectedDevice: (d) => set({ selectedDevice: d }),
}));