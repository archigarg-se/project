import { create } from "zustand";

export type Alarm = {
  ticket_number: number;
  name: string;
  priority: string;
  status: string;
  site__display_name: string;
  last_updated_at: string;
  assignee__username: string;
  deviceId?: string;
  category?: string;
  config?: any;
};

type AlarmsState = {
  alarms: Alarm[];
  loading: boolean;
  setAlarms: (alarms: Alarm[]) => void;
  setLoading: (loading: boolean) => void;
};

export const useAlarmsStore = create<AlarmsState>((set) => ({
  alarms: [],
  loading: true,
  setAlarms: (alarms) => set({ alarms }),
  setLoading: (loading) => set({ loading }),
}));