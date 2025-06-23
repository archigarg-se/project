import { useEffect, useRef } from "react";
import axios from "axios";
import { DataTable } from "./components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import AlarmForm from "./components/AlarmForm";
import AlarmHoverCard from "./components/AlarmHoverCard";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { useAlarmsStore } from "./stores/alarms";
import { useConfigStore } from "./stores/config";
import { useUIStore } from "./stores/ui";
import { useAuthStore } from "./stores/auth";

const BACKEND_MODE = import.meta.env.VITE_BACKEND_MODE;
const apiBase = BACKEND_MODE === "server" ? "http://localhost:4000" : "";
const axiosInstance = axios.create({ baseURL: apiBase });

function App() {
  // Zustand stores
  const { alarms, setAlarms, loading, setLoading } = useAlarmsStore();
  const { config, showConfig, setConfig, setShowConfig } = useConfigStore();
  const { showForm, setShowForm, modalAlarm, setModalAlarm, modalVisible, setModalVisible } = useUIStore();
  const { token, loginError, setToken, setUser, setLoginError } = useAuthStore();

  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (import.meta.env.VITE_BACKEND_MODE === "msw") {
      const interval1 = setInterval(() => {
        fetch("/api/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: "device-1",
            metric: "temperature",
            value: 60 + Math.round(Math.random() * 20),
            timestamp: new Date().toISOString(),
          }),
        });
      }, 5000);

      const interval2 = setInterval(() => {
        fetch("/api/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: "device-2",
            metric: "humidity",
            value: 50 + Math.round(Math.random() * 40),
            timestamp: new Date().toISOString(),
          }),
        });
      }, 5000);

      return () => {
        clearInterval(interval1);
        clearInterval(interval2);
      };
    }
  }, []);

  // Fetch rules from backend/MSW on mount or when config modal closes
  useEffect(() => {
    if (!token) return;
    axiosInstance.get("/api/rules").then((res) => {
      setConfig(res.data);
    });
  }, [token, showConfig, setConfig]);

  // Fetch alarms on mount
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axiosInstance.get("/api/alarms", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      setAlarms(res.data.alarms);
      setLoading(false);
    });
  }, [token, setAlarms, setLoading]);

  // Show login form if not authenticated
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

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "ticket_number",
      header: "Ticket ID",
      cell: ({ row }) => (
        <span
          className="underline text-blue-700 cursor-pointer"
          onMouseEnter={() => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
            hoverTimeout.current = setTimeout(() => {
              setModalAlarm(row.original);
              setModalVisible(true);
            }, 200);
          }}
          onMouseLeave={() => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
            setModalVisible(false);
            setTimeout(() => setModalAlarm(null), 200);
          }}
        >
          {row.original.ticket_number}
        </span>
      ),
    },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "priority", header: "Priority" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "site__display_name", header: "Site" },
    { accessorKey: "last_updated_at", header: "Last Updated" },
    { accessorKey: "assignee__username", header: "Assignee" },
  ];

  return (
    <div>
      <header className="w-full bg-pink-500 py-1 fixed top-0 left-0 z-10">
        <h1 className="text-xs font-semibold text-white ml-4">Alerts</h1>
        <Button
          className="absolute top-3 right-2"
          variant="outline"
          onClick={() => {
            setToken(null);
            setUser(null);
          }}
        >
          Logout
        </Button>
      </header>
      <Button
        className="mb-2 mr-4 ml-4 px-3 py-1"
        variant="outline"
        size="sm"
        onClick={() => setShowConfig(true)}
      >
        Configure Rules
      </Button>

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
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); handleConfigSave(); }}>
              <div>
                <label className="block text-xs mb-1">Temperature</label>
                <div className="flex gap-2">
                  <select
                    value={config.temperature.operator}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        temperature: {
                          ...config.temperature,
                          operator: e.target.value,
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
                    value={config.temperature.value}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        temperature: {
                          ...config.temperature,
                          value: Number(e.target.value),
                        },
                      })
                    }
                    className="border rounded px-2 py-1 w-20 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1">Humidity</label>
                <div className="flex gap-2">
                  <select
                    value={config.humidity.operator}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        humidity: { ...config.humidity, operator: e.target.value },
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
                    value={config.humidity.value}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        humidity: {
                          ...config.humidity,
                          value: Number(e.target.value),
                        },
                      })
                    }
                    className="border rounded px-2 py-1 w-20 text-xs"
                  />
                </div>
              </div>
              <Button type="submit" variant="outline">Save</Button>
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
      <div className="mt-6">
        <h2 className="text-lg font-bold ml-8 mb-2">Alarms</h2>
        {loading ? (
          <div >Loading...</div>
        ) : (
          <DataTable columns={columns} data={alarms} />
        )}
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
          />
        </div>
      )}
    </div>
  );
}

export default App;