import React, { useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { useAlarmsStore } from "./stores/alarms";
import type { Alarm } from "./stores/alarms";
import { useConfigStore } from "./stores/config";
import { useUIStore } from "./stores/ui";
import { useAuthStore } from "./stores/auth";
import { getRandomDeviceConfig } from "./lib/utils";
import InvalidDataButton from "./components/invalid";
import { useFiltersStore } from "./stores/filters";
import AlarmForm from "./components/AlarmForm";
import AlarmHoverCard from "./components/AlarmHoverCard";

const BACKEND_MODE = import.meta.env.VITE_BACKEND_MODE;
const apiBase = BACKEND_MODE === "server" ? "http://localhost:4000" : "";
const axiosInstance = axios.create({ baseURL: apiBase });

function App() {
  // Zustand stores
  const { alarms, setAlarms, loading, setLoading } = useAlarmsStore();
  const { config, showConfig, setConfig, setShowConfig } = useConfigStore();
  const {
    showForm,
    setShowForm,
    modalAlarm,
    setModalAlarm,
    modalVisible,
    setModalVisible,
    selectedDevice,
    setSelectedDevice,
  } = useUIStore();
  const { token, loginError, setToken, setUser, setLoginError } =
    useAuthStore();

  // Zustand filters store
  const filters = useFiltersStore();
  const setFilter = useFiltersStore((s) => s.setFilter);
  const resetFilters = useFiltersStore((s) => s.resetFilters);
  const sortBy = useFiltersStore((s) => s.sortBy);
  const sortOrder = useFiltersStore((s) => s.sortOrder);
  const setSort = useFiltersStore((s) => s.setSort);

  const DEVICE_CONFIG = React.useMemo(
    () => getRandomDeviceConfig(),
    [showConfig]
  );
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const refreshAlarms = React.useCallback(async () => {
    setLoading(true);
    const res = await axiosInstance.get("/api/alarms", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setAlarms(res.data.alarms);
    setLoading(false);
  }, [setAlarms, setLoading, token]);

  useEffect(() => {
    if (!token) return;
    axiosInstance.get("/api/rules").then((res) => {
      setConfig(res.data);
    });
  }, [token, showConfig, setConfig]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axiosInstance
      .get("/api/alarms", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setAlarms(res.data.alarms);
        setLoading(false);
      });
  }, [token, setAlarms, setLoading]);

  if (!token) {
    return (
      <div className="flex ml-120 items-center justify-center bg-gray-50">
        <form
          className="bg-white p-8 rounded-xl shadow-lg w-full max-w-xs space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const username = (
              e.currentTarget.elements.namedItem("username") as HTMLInputElement
            ).value;
            const password = (
              e.currentTarget.elements.namedItem("password") as HTMLInputElement
            ).value;
            try {
              const res = await axiosInstance.post("/api/login", {
                username,
                password,
              });
              setToken(res.data.token);
              setUser(res.data.user);
              setLoginError("");
            } catch (err: any) {
              setLoginError("Invalid credentials");
            }
          }}
        >
          <h2 className="font-bold mb-2 text-xl text-center">Login</h2>
          <Input
            name="username"
            placeholder="Username"
            className="mb-2"
            required
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            className="mb-2"
            required
          />
          {loginError && (
            <div className="text-red-600 text-xs mb-2 text-center">
              {loginError}
            </div>
          )}
          <Button type="submit" variant="outline" className="w-full">
            Login
          </Button>
        </form>
      </div>
    );
  }

  // Save rules to backend/MSW when config changes
  const handleConfigSave = async () => {
    await axiosInstance.post("/api/rules", config);
    setShowConfig(false);
  };

  const handleAlarmAdded = async () => {
    setShowForm(false);
    setLoading(true);
    const res = await axiosInstance.get("/api/alarms", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setAlarms(res.data.alarms);
    setLoading(false);
  };

  const deviceMetrics = DEVICE_CONFIG[selectedDevice]?.metrics || [];

  // Filtering logic
  const filteredAlarms = alarms.filter(
    (alarm) =>
      (!filters.ticket_number ||
        alarm.ticket_number.toString().includes(filters.ticket_number)) &&
      (!filters.name ||
        alarm.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.priority ||
        alarm.priority
          ?.toLowerCase()
          .includes(filters.priority.toLowerCase())) &&
      (!filters.status ||
        alarm.status?.toLowerCase().includes(filters.status.toLowerCase())) &&
      (!filters.site__display_name ||
        alarm.site__display_name
          ?.toLowerCase()
          .includes(filters.site__display_name.toLowerCase())) &&
      (!filters.last_updated_at ||
        alarm.last_updated_at
          ?.toLowerCase()
          .includes(filters.last_updated_at.toLowerCase())) &&
      (!filters.assignee__username ||
        alarm.assignee__username
          ?.toLowerCase()
          .includes(filters.assignee__username.toLowerCase()))
  );

  // Sorting logic
  let sortedAlarms = [...filteredAlarms];
  if (sortBy && sortOrder) {
    sortedAlarms.sort((a, b) => {
      const key = sortBy as keyof Alarm;
      let aVal = a[key];
      let bVal = b[key];
      // Special case for date
      if (key === "last_updated_at") {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Table columns config
  const columns = [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "name", label: "Name" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "site__display_name", label: "Site" },
    { key: "last_updated_at", label: "Last Updated" },
    { key: "assignee__username", label: "Assignee" },
  ];

  // --- Sorting Button Handler ---
  function handleSort(colKey: string, order: "asc" | "desc") {
    setSort(colKey, order);
  }

  return (
    <div>
      <header className="w-full py-6 px-8 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-b-xl shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Alerts</h1>
          <Button
            variant="outline"
            onClick={() => {
              setToken(null);
              setUser(null);
            }}
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="flex gap-16 justify-start mt-6 px-8 flex-wrap">
        <div className="bg-white rounded-xl shadow p-4 w-60 text-center">
          <p className="text-sm font-medium mb-1">Configure Rules</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(true)}
          >
            Open
          </Button>
        </div>
        <div className="bg-white rounded-xl shadow p-4 w-60 text-center">
          <InvalidDataButton />
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg p-6 min-w-[340px] max-w-md relative">
            <button
              className="absolute top-2 right-2 text-black-500 hover:text-black"
              onClick={() => setShowConfig(false)}
              aria-label="Close"
            >
              x
            </button>
            <h2 className="font-bold mb-4 text-lg text-center">
              Set Alert Rules
            </h2>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleConfigSave();
              }}
            >
              <div>
                <label className="block text-xs mb-1">Device</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                >
                  {Object.keys(DEVICE_CONFIG).map((deviceId) => (
                    <option key={deviceId} value={deviceId}>
                      {deviceId}
                    </option>
                  ))}
                </select>
              </div>
              {deviceMetrics.map((metric: string) => (
                <div key={metric}>
                  <label className="block text-xs mb-1 capitalize">
                    {metric}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={config[selectedDevice]?.[metric]?.operator || ">"}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          [selectedDevice]: {
                            ...config[selectedDevice],
                            [metric]: {
                              ...config[selectedDevice]?.[metric],
                              operator: e.target.value,
                            },
                          },
                        })
                      }
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value=">=">&ge;</option>
                      <option value="<=">&le;</option>
                    </select>
                    <input
                      type="number"
                      value={config[selectedDevice]?.[metric]?.value || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          [selectedDevice]: {
                            ...config[selectedDevice],
                            [metric]: {
                              ...config[selectedDevice]?.[metric],
                              value: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="border rounded px-2 py-1 w-20 text-xs"
                    />
                  </div>
                </div>
              ))}
              <Button type="submit" variant="outline">
                Save
              </Button>
            </form>
          </div>
        </div>
      )}

      {BACKEND_MODE === "msw" && (
        <Button
          className="mb-4 px-4 py-2"
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          Simulate Telemetry
        </Button>
      )}
      {BACKEND_MODE === "msw" && showForm && (
        <AlarmForm
          onClose={() => setShowForm(false)}
          onSuccess={handleAlarmAdded}
          config={config}
        />
      )}

      <h2 className="text-lg font-bold text-center mb-2">Alarms</h2>
      {/* Filter Row and Table */}
      <div className="flex justify-center">
        <div className="w-full max-w-7xl overflow-x-auto rounded-lg shadow bg-white">
          <div className="flex gap-4 mt-6 mb-4 px-8">
            <Input
              className="w-1/3 rounded-full px-4 py-2 text-sm"
              placeholder="Search Ticket or Name"
              value={filters.name}
              onChange={(e) => {
                setFilter("ticket_number", e.target.value);
                setFilter("name", e.target.value);
              }}
            />
            <Input
              className="w-1/4 rounded-full px-4 py-2 text-sm"
              placeholder="Site"
              value={filters.site__display_name}
              onChange={(e) => setFilter("site__display_name", e.target.value)}
            />
            <Input
              className="w-1/4 rounded-full px-4 py-2 text-sm"
              placeholder="Assignee"
              value={filters.assignee__username}
              onChange={(e) => setFilter("assignee__username", e.target.value)}
            />
          </div>
          {/* Table */}
          <div className="overflow-x-auto px-8">
            <table className="min-w-full bg-white rounded-xl shadow text-sm">
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="text-left px-4 py-3">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAlarms.map((alarm) => (
                  <tr
                    className="border-t hover:bg-gray-50"
                    key={alarm.ticket_number}
                  >
                    <td className="px-4 py-2">{alarm.ticket_number}</td>
                    <td className="px-4 py-2">{alarm.name}</td>
                    <td className="px-4 py-2">{alarm.priority}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-white text-xs ${
                          alarm.status === "resolved"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      >
                        {alarm.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{alarm.site__display_name}</td>
                    <td className="px-4 py-2">{alarm.last_updated_at}</td>
                    <td className="px-4 py-2">{alarm.assignee__username}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalAlarm && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30 transition-opacity duration-200 ${
            modalVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <AlarmHoverCard
            alarm={modalAlarm}
            onClose={() => {
              setModalVisible(false);
              setTimeout(() => setModalAlarm(null), 400);
            }}
            onStatusChange={refreshAlarms}
          />
        </div>
      )}
    </div>
  );
}

export default App;
