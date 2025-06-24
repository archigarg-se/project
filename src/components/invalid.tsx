import { useState } from "react";
// ...other imports...

 function InvalidDataButton() {
  const [count, setCount] = useState<number | null>(null);

  const handleClick = async () => {
    const res = await fetch("/messages_log.csv");
    const text = await res.text();
    const now = Date.now();
    const lines = text.split("\n").filter(Boolean);
    let invalidCount = 0;
    for (const line of lines) {
      const cols = line.split(",");
      const timestamp = new Date(cols[0].trim()).getTime();
      const status = cols[6]?.trim();
      if (status === "invalid" && now - timestamp < 24 * 60 * 60 * 1000) {
        invalidCount++;
      }
    }
    setCount(invalidCount);
  };

  return (
    <div className="mb-2 ml-4">
      <button
        className="px-3 py-1 border rounded bg-yellow-100 hover:bg-yellow-200"
        onClick={handleClick}
      >
        Invalid Data (last 24h)
      </button>
      {count !== null && (
        <span className="ml-2 text-sm text-red-600">
          Invalid data in last 24 hours: {count}
        </span>
      )}
    </div>
  );
}

export default InvalidDataButton;