import { useEffect } from "react";
import { useInvalidStore } from "../stores/invalid";

function InvalidDataButton() {
  const count = useInvalidStore((s) => s.count);
  const fetchCount = useInvalidStore((s) => s.fetchCount);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return (
    <button
      className="w-64 h-20 bg-white rounded-xl shadow border-0 text-lg font-semibold text-gray-700 hover:bg-green-50 transition-all flex flex-col items-center justify-center"
      title="Invalid data in last 24 hours"
    >
      Invalid Data (last 24H):
      <div className="mt-2 text-red-500  px-4 py-1 font-bold text-lg">
        {count}
      </div>
    </button>
  );
}

export default InvalidDataButton;