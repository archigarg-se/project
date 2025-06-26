import { useEffect } from "react";
import { useInvalidStore } from "../stores/invalid";
import { WiTime2 } from "react-icons/wi";

function InvalidDataButton() {
  const count = useInvalidStore((s) => s.count);
  const fetchCount = useInvalidStore((s) => s.fetchCount);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return (
    <div
      className="w-60 h-20 bg-white rounded-xl shadow flex items-center px-5 transition-all"
      style={{ boxShadow: "0 2px 8px 0 rgba(16,30,54,.08)" }}
    >
      <span className="mr-3">
        <WiTime2  className="text-4xl text-gray-700" />
      </span>
      <div className="flex flex-col flex-1">
        <span className="font-semibold text-gray-800 text-lg leading-tight">Invalid Data</span>
        <span className="text-xs text-gray-400">(last 24H):</span>
      </div>
      <span className="ml-3 bg-red-500 text-white rounded-full px-3 py-1 font-bold text-lg flex items-center justify-center">
        {count}
      </span>
    </div>
  );
}

export default InvalidDataButton;