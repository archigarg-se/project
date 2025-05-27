import React, { useEffect, useRef, useState } from "react";
import { DataTable } from "./components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import AlarmForm from "@/components/AlarmForm";

type Alarm = {
  ticket_number: number;
  name: string;
  priority: string;
  status: string;
  site__display_name: string;
  last_updated_at: string;
  assignee__username: string;
};

function App() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [modalAlarm, setModalAlarm] = useState<Alarm | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

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

  // Move columns inside the component to access setModalAlarm
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
            }, 200); // 200ms delay before showing modal
          }}
          onMouseLeave={() => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
            setModalVisible(false);
            setTimeout(() => setModalAlarm(null), 200); // Wait for fade-out
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
          >
            <div
              className="bg-white rounded shadow-lg p-6 min-w-[300px] max-w-md transition-all duration-200"
              onMouseLeave={() => {
                setModalVisible(false);
                setTimeout(() => setModalAlarm(null), 400);
              }}
            >
              <h3 className="text-lg font-bold mb-2">
                Ticket ID {modalAlarm.ticket_number}
              </h3>
              <div className="mb-2 text-sm text-gray-700">
                <div>
                  <b>Name:</b> {modalAlarm.name}
                </div>
                <div>
                  <b>Priority:</b> {modalAlarm.priority}
                </div>
                <div>
                  <b>Status:</b> {modalAlarm.status}
                </div>
                <div>
                  <b>Site:</b> {modalAlarm.site__display_name}
                </div>
                <div>
                  <b>Last Updated:</b> {modalAlarm.last_updated_at}
                </div>
                <div>
                  <b>Assignee:</b> {modalAlarm.assignee__username}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <b>Reason:</b> {modalAlarm.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;