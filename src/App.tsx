import React, { useEffect } from "react";
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
import { IoIosSettings } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";
import { MdOutlineAccessTimeFilled } from "react-icons/md";

const BACKEND_MODE = import.meta.env.VITE_BACKEND_MODE;
const apiBase = BACKEND_MODE === "server" ? "http://localhost:4000" : "";
const axiosInstance = axios.create({ baseURL: apiBase });

function App() {
  // Zustand stores
  const { alarms, setAlarms, setLoading } = useAlarmsStore();
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
  const sortBy = useFiltersStore((s) => s.sortBy);
  const sortOrder = useFiltersStore((s) => s.sortOrder);
  const setSort = useFiltersStore((s) => s.setSort);

  const DEVICE_CONFIG = React.useMemo(
    () => getRandomDeviceConfig(),
    [showConfig]
  );

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
  const filteredAlarms = alarms.filter((alarm) => {
    const search = filters.name?.toLowerCase() || "";
    const ticketMatch = alarm.ticket_number.toString().toLowerCase().includes(search);
    const nameMatch = alarm.name?.toLowerCase().includes(search);
    const matchesSearch = !search || ticketMatch || nameMatch;
    return (
      matchesSearch &&
      (!filters.priority || alarm.priority?.toLowerCase().includes(filters.priority.toLowerCase())) &&
      (!filters.status || alarm.status?.toLowerCase().includes(filters.status.toLowerCase())) &&
      (!filters.site__display_name || alarm.site__display_name?.toLowerCase().includes(filters.site__display_name.toLowerCase())) &&
      (!filters.last_updated_at || alarm.last_updated_at?.toLowerCase().includes(filters.last_updated_at.toLowerCase())) &&
      (!filters.assignee__username || alarm.assignee__username?.toLowerCase().includes(filters.assignee__username.toLowerCase()))
    );
  });

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
    <div className="min-h-screen min-w-screen overflow-x-hidden bg-gray-50">
      <header className="w-full relative py-6 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
        <div className="flex items-center justify-between w-full">
          <h1 className="ml-6 text-2xl font-bold text-gray-800">Alerts</h1>
          <div className="mr-6">
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
        </div>
      </header>

     <div className="flex gap-8 justify-center mt-10 mb-8">
  <button
    onClick={() => setShowConfig(true)}
    className="w-64 h-20 bg-white rounded-xl shadow text-lg font-semibold text-gray-700 flex items-center justify-center gap-4 transition-all"
    style={{ boxShadow: "0 2px 8px 0 rgba(16,30,54,.08)" }}
  >
    <IoIosSettings className="text-2xl text-gray-700" />
    <span className="text-lg font-semibold text-gray-700">Configure Rules</span>
  </button>
  <InvalidDataButton />
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

      {/* Filter Row and Table */}
      <div className="w-full flex justify-center">
        <div className="w-full ml-12 mr-12 mt-12">
          {/* Filter Row */}
          <div className="flex flex-wrap gap-2 mb-2">
            <div className="relative flex-1 min-w-[180px]">
    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
      <IoIosSearch />
    </span>
    <Input
      className="border rounded pl-8 pr-2 py-1 w-full"
      placeholder="Search Ticket or Name"
      value={filters.name}
      onChange={(e) => {
        setFilter("name", e.target.value);
        setFilter("ticket_number", e.target.value);
      }}
    />
  </div>
            <Input
              className="border rounded px-2 py-1 flex-1 min-w-[120px]"
              placeholder="Site"
              value={filters.site__display_name}
              onChange={(e) => setFilter("site__display_name", e.target.value)}
            />
            <Input
              className="border rounded px-2 py-1 flex-1 min-w-[120px]"
              placeholder="Assignee"
              value={filters.assignee__username}
              onChange={(e) => setFilter("assignee__username", e.target.value)}
            />
          </div>
          <div className="overflow-x-auto bg-white w-full">
            <table className="min-w-full w-full text-sm text-left">
              <thead className="bg-gray-100">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-2 font-semibold select-none"
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <button
                          className="text-xs bg-gray-100 px-1 outline-none"
                          onClick={() =>
                            handleSort(
                              col.key,
                              sortOrder === "asc" && sortBy === col.key
                                ? "desc"
                                : "asc"
                            )
                          }
                        >
                          <span
                            className={
                              sortBy === col.key && sortOrder === "asc"
                                ? "text-blue-600"
                                : "text-gray-400"
                            }
                          >
                            ▲
                          </span>
                          <span
                            className={
                              sortBy === col.key && sortOrder === "desc"
                                ? "text-blue-600"
                                : "text-gray-400"
                            }
                          >
                            ▼
                          </span>
                        </button>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAlarms.map((alarm) => (
                  <tr
                    key={alarm.ticket_number}
                    className="hover:bg-blue-50 cursor-pointer transition"
                    onClick={() => {
                      setModalAlarm(alarm);
                      setModalVisible(true);
                    }}
                  >
                    <td className="px-4 py-2 border-b">{alarm.ticket_number}</td>
                    <td className="px-4 py-2 border-b">{alarm.name}</td>
                    <td className="px-4 py-2 border-b">{alarm.priority}</td>
                    <td className="px-4 py-2 border-b">
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
                    <td className="px-4 py-2 border-b">{alarm.site__display_name}</td>
                    <td className="px-4 py-2 border-b">{alarm.last_updated_at}</td>
                    <td className="px-4 py-2 border-b">{alarm.assignee__username}</td>
                  </tr>
                ))}
                {sortedAlarms.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-4 text-gray-400">
                      No alarms found.
                    </td>
                  </tr>
                )}
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