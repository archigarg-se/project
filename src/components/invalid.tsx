import { useEffect } from "react";
import { useInvalidStore } from "../stores/invalid";

function InvalidDataButton() {
  const count = useInvalidStore((s) => s.count);
  const fetchCount = useInvalidStore((s) => s.fetchCount);

  useEffect(() => {
    fetchCount();
    // Optionally, refresh every 10s:
    // const interval = setInterval(fetchCount, 10000);
    // return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <div className="mb-2 ml-4">
      <button
        className="px-3 py-1 border rounded bg-yellow-100 hover:bg-yellow-200"
        title="Invalid data in last 24 hours"
      >
        Invalid Data (last 24h):{" "}
        <span className="text-red-600 font-semibold">{count}</span>
      </button>
    </div>
  );
}

export default InvalidDataButton;