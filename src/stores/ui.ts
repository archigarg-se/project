import { create } from "zustand";
import type { Alarm } from "./alarms";

type UIState = {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  modalAlarm: Alarm | null;
  setModalAlarm: (alarm: Alarm | null) => void;
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  showForm: false,
  setShowForm: (show) => set({ showForm: show }),
  modalAlarm: null,
  setModalAlarm: (alarm) => set({ modalAlarm: alarm }),
  modalVisible: false,
  setModalVisible: (visible) => set({ modalVisible: visible }),
}));