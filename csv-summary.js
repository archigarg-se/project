import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
const CSV_FILE = path.join(process.cwd(), "messages_log.csv");
const SUMMARY_FILE = path.join(process.cwd(), "messages_summary.csv");

const content = fs.readFileSync(CSV_FILE, "utf-8");
const records = parse(content, {
  columns: false,
  skip_empty_lines: true,
  trim: true,
  relax_quotes: true
});

const statsByDay = {};

for (const rec of records) {
  const day = rec[0].slice(0, 10); // timestamp is at index 0
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
  if (rec[6] === "generated" || rec[6] === "updated/open" || rec[6] === "resolved") {
    statsByDay[day].total_tickets++;
  } else if (rec[6] === "no ticket") {
    statsByDay[day].total_no_tickets++;
  } else if (rec[6] === "invalid") {
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
