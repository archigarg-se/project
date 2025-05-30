import { useRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

function AlarmHoverCard({
  alarm,
  onClose,
}: {
  alarm: any;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

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
      className="bg-white rounded shadow-lg p-6 min-w-[340px] max-w-md transition-all duration-200 relative"
    >
      <Tabs defaultValue="basic">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
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
            {/* Add more fields as needed */}
          </div>
        </TabsContent>
        <TabsContent value="config">
  <div className="text-sm text-gray-700 space-y-2">
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
    {/* Add more config details as needed */}
  </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default AlarmHoverCard;