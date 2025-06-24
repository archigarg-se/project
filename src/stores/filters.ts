import { create } from "zustand";

type SortOrder = "asc" | "desc" | "";

interface Filters {
  ticket_number: string;
  name: string;
  priority: string;
  status: string;
  site__display_name: string;
  last_updated_at: string;
  assignee__username: string;
  sortBy: string;
  sortOrder: SortOrder;
  setFilter: (key: keyof Omit<Filters, "setFilter" | "resetFilters" | "sortBy" | "sortOrder" | "setSort">, value: string) => void;
  resetFilters: () => void;
  setSort: (column: string, order: SortOrder) => void;
}

export const useFiltersStore = create<Filters>((set) => ({
  ticket_number: "",
  name: "",
  priority: "",
  status: "",
  site__display_name: "",
  last_updated_at: "",
  assignee__username: "",
  sortBy: "",
  sortOrder: "",
  setFilter: (key, value) => set({ [key]: value }),
  resetFilters: () =>
    set({
      ticket_number: "",
      name: "",
      priority: "",
      status: "",
      site__display_name: "",
      last_updated_at: "",
      assignee__username: "",
    }),
  setSort: (column, order) => {
    set({ sortBy: column, sortOrder: order });
  },
}));