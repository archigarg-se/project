import { useEffect, useRef, useState } from "react";
import { DataTable } from "./components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import AlarmForm from "@/components/AlarmForm";
import AlarmHoverCard from "@/components/AlarmHoverCard";
type Alarm = {
  ticket_number: number;
  name: string;
  priority: string;
  status: string;
  site__display_name: string;
  last_updated_at: string;
  assignee__username: string;
};

type Config = {
  temperature: { operator: string; value: number };
  humidity: { operator: string; value: number };
};

function App() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [modalAlarm, setModalAlarm] = useState<Alarm | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  // Configurable thresholds
  const [config, setConfig] = useState<Config>({
    temperature: { operator: ">", value: 70 },
    humidity: { operator: ">", value: 90 },
  });

  useEffect(() => {
    fetch("/api/alarms")
      .then((res) => res.json())
      .then((data) => {
        setAlarms(data.alarms);
        setLoading(false);
      });
  }, []);

  const handleAlarmAdded = async () => {
    setShowForm(false);
    setLoading(true);
    const res = await fetch("/api/alarms");
    const data = await res.json();
    setAlarms(data.alarms);
    setLoading(false);
  };

  const columns: ColumnDef<Alarm>[] = [
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
      </header>
      <div className="p-4 pt-14">
        {/* Config Form */}
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2 text-sm">Set Alert Rules</h2>
          <form className="flex flex-wrap gap-4 items-end">
            {/* Temperature Rule */}
            <div>
              <label className="block text-xs">Temperature</label>
              <select
                value={config.temperature.operator}
                onChange={(e) =>
                  setConfig((cfg) => ({
                    ...cfg,
                    temperature: {
                      ...cfg.temperature,
                      operator: e.target.value,
                    },
                  }))
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
                  setConfig((cfg) => ({
                    ...cfg,
                    temperature: {
                      ...cfg.temperature,
                      value: Number(e.target.value),
                    },
                  }))
                }
                className="border rounded px-2 py-1 ml-2 w-16 text-xs"
              />
            </div>
            {/* Humidity Rule */}
            <div>
              <label className="block text-xs">Humidity</label>
              <select
                value={config.humidity.operator}
                onChange={(e) =>
                  setConfig((cfg) => ({
                    ...cfg,
                    humidity: { ...cfg.humidity, operator: e.target.value },
                  }))
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
                  setConfig((cfg) => ({
                    ...cfg,
                    humidity: {
                      ...cfg.humidity,
                      value: Number(e.target.value),
                    },
                  }))
                }
                className="border rounded px-2 py-1 ml-2 w-16 text-xs"
              />
            </div>
          </form>
        </div>
        <button
          className="mb-4 px-4 py-2 bg-blue-600 text-black rounded"
          onClick={() => setShowForm(true)}
        >
          Simulate Telemetry
        </button>
        {showForm && (
          <AlarmForm
            onClose={() => setShowForm(false)}
            onSuccess={handleAlarmAdded}
            config={config}
          />
        )}
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2">Alarms</h2>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <DataTable columns={columns} data={alarms} />
          )}
        </div>
        {modalAlarm && (
  <div
    className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30 transition-opacity duration-200 ${
      modalVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}
    // Remove onMouseLeave here!
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
    </div>
  );
}

export default App;
