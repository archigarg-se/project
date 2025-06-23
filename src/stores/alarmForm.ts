import { create } from "zustand";
type AlarmFormState = {
  form: {
    deviceId: string;
    metric: string;
    value: string;
    timestamp: string;
    site__display_name: string;
  };
  loading: boolean;
  error: string;
  setForm: (form: Partial<AlarmFormState["form"]>) => void;
  resetForm: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
};

const initialState = {
  deviceId: "",
  metric: "",
  value: "",
  timestamp: "",
  site__display_name: "",
};

export const useAlarmFormStore = create<AlarmFormState>((set) => ({
  form: initialState,
  loading: false,
  error: "",
  setForm: (form) =>
    set((state) => ({ form: { ...state.form, ...form } })),
  resetForm: () => set({ form: initialState, error: "", loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));