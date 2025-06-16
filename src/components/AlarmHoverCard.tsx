import { useRef, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
const BACKEND_MODE = import.meta.env.VITE_BACKEND_MODE;

function AlarmHoverCard({
  alarm,
  onClose,
}: {
  alarm: any;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<
    { value: number; timestamp: string }[]
  >([]);

  // Fetch device history when modal opens
  useEffect(() => {
    if (!alarm.deviceId || !alarm.category) return;
    const apiBase = BACKEND_MODE === "server" ? "http://localhost:4000" : "";
    axios
      .get(
        `${apiBase}/api/history?deviceId=${encodeURIComponent(
          alarm.deviceId
        )}&metric=${encodeURIComponent(alarm.category)}`
      )
      .then((res) => setHistory(res.data));
  }, [alarm.deviceId, alarm.category]);

  // Close on outside click
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={modalRef}
      className="bg-white rounded shadow-lg p-6 min-w-[340px] max-w-2xl w-full transition-all duration-200 relative"
      style={{ maxWidth: 700 }}
    >
      <Tabs defaultValue="basic">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="history">Device History</TabsTrigger>
        </TabsList>
        <TabsContent value="basic">
          <div className="text-sm text-gray-700 space-y-2">
            <div>
              <b>Name:</b> {alarm.name}
            </div>
            <div>
              <b>Status:</b> {alarm.status}
            </div>
            <div>
              <b>Priority:</b> {alarm.priority}
            </div>
            <div>
              <b>Site:</b> {alarm.site__display_name}
            </div>
            <div>
              <b>Last Updated:</b> {alarm.last_updated_at}
            </div>
            <div>
              <b>Assignee:</b> {alarm.assignee__username}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="config">
          <div className="text-sm text-gray-700 space-y-2">
        
            <button
              className="absolute bottom-2 right-20 bg-yellow-400 text-black px-3 py-1 rounded hover:bg-yellow-500"
              onClick={async () => {
                await axios.post("/api/snooze", {
                  ticket_number: alarm.ticket_number,
                  comment: `Snoozed at ${new Date().toISOString()}`,
                });
                onClose();
              }}
            >
              Snooze
            </button>
            <div>
              <b>Device ID:</b> {alarm.deviceId || "N/A"}
            </div>
            <div>
              <b>Metric:</b> {alarm.category}
            </div>
            <div>
              <b>Rule:</b>{" "}
              {alarm.category === "temperature" && alarm.config?.temperature
                ? `Temperature ${alarm.config.temperature.operator} ${alarm.config.temperature.value}`
                : alarm.category === "humidity" && alarm.config?.humidity
                ? `Humidity ${alarm.config.humidity.operator} ${alarm.config.humidity.value}`
                : "N/A"}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div className="text-sm text-gray-700 space-y-2">
            <b>Last 60 Minutes ({alarm.category}):</b>
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={Array.isArray(history) ? history : []}>
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(t) =>
                      new Date(t).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                    minTickGap={15}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(t) =>
                      new Date(t).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <button
        className="absolute top-2 right-2 text-gray-500 hover:text-black"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}
export default AlarmHoverCard;
