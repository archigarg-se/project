import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";

const CSV_FILE = path.join(process.cwd(), "messages_log.csv");
const SUMMARY_FILE = path.join(process.cwd(), "messages_summary.csv");

const content = fs.readFileSync(CSV_FILE, "utf-8");
const records = parse(content, {
  columns: ["timestamp", "deviceId", "metric", "value", "ticket_status", "ticket_number", "msg"],
  skip_empty_lines: true,
});

const statsByDay = {};

for (const rec of records) {
  const day = rec.timestamp.slice(0, 10); 
  if (!statsByDay[day]) {
    statsByDay[day] = {
      date: day,
      total_messages: 0,
      total_tickets: 0,
      total_no_tickets: 0,
      total_invalid: 0,
    };
  }
  statsByDay[day].total_messages++;
  if (rec.ticket_status === "generated" || rec.ticket_status === "updated/open" || rec.ticket_status === "resolved") {
    statsByDay[day].total_tickets++;
  } else if (rec.ticket_status === "no ticket") {
    statsByDay[day].total_no_tickets++;
  } else if (rec.ticket_status === "invalid") {
    statsByDay[day].total_invalid++;
  }
}

// Prepare CSV header and rows
const header = "date,total_messages,total_tickets,total_no_tickets,total_invalid\n";
const rows = Object.values(statsByDay)
  .map(stat =>
    [stat.date, stat.total_messages, stat.total_tickets, stat.total_no_tickets, stat.total_invalid].join(",")
  )
  .join("\n");

// Write to summary CSV
fs.writeFileSync(SUMMARY_FILE, header + rows);

console.log(`Summary written to ${SUMMARY_FILE}`);