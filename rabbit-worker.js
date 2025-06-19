import amqp from "amqplib";
import axios from "axios";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

const QUEUE = "telemetry";
const CSV_FILE = "messages_log.csv";

const csvWriter = createObjectCsvWriter({
  path: CSV_FILE,
  header: [
    { id: "timestamp", title: "Timestamp" },
    { id: "deviceId", title: "Device ID" },
    { id: "metric", title: "Metric" },
    { id: "value", title: "Value" },
    { id: "ticket_status", title: "Ticket Status" },
    { id: "ticket_number", title: "Ticket Number" },
    { id: "msg", title: "Message" },
  ],
  append: fs.existsSync(CSV_FILE), // Append if file exists
});

async function getRules() {
  const { data } = await axios.get("http://localhost:4000/api/rules");
  return data;
}

async function getAlarms() {
  const { data } = await axios.get("http://localhost:4000/api/alarms");
  return data.alarms;
}

function checkRule(type, value, rules) {
  const rule = rules[type];
  if (!rule) return false;
  switch (rule.operator) {
    case ">":
      return value > rule.value;
    case "<":
      return value < rule.value;
    case ">=":
      return value >= rule.value;
    case "<=":
      return value <= rule.value;
    default:
      return false;
  }
}

function isInvalidData(data, rules) {
  // Unknown metric
  if (!["temperature", "humidity"].includes(data.type)) return true;
  // Out-of-range value (customize as needed)
  if (data.type === "temperature" && (data.value < -50 || data.value > 500))
    return true;
  if (data.type === "humidity" && (data.value < 0 || data.value > 100))
    return true;
  return false;
}

async function start() {
  const conn = await amqp.connect("amqp://localhost:5672");
  const ch = await conn.createChannel();
  await ch.assertQueue(QUEUE);
  setInterval(async () => {
    const type = Math.random() > 0.5 ? "temperature" : "humidity";
    const value = Math.floor(Math.random() * 120);
    const deviceId = `device-${Math.ceil(Math.random() * 10)}`;
    const timestamp = new Date().toISOString();
    const msg = JSON.stringify({
      type,
      value,
      deviceId,
      timestamp,
    });
    ch.sendToQueue(QUEUE, Buffer.from(msg));
    console.log("Sent:", msg);

    // Save telemetry to backend for charting
    await axios.post("http://localhost:4000/api/telemetry", {
      deviceId,
      metric: type,
      value,
      timestamp,
    });
  }, 60 * 500);

  setInterval(() => {
    const msg = JSON.stringify({
      type: "pressure", // invalid metric
      value: 200,
      deviceId: "device-invalid",
      timestamp: new Date().toISOString(),
    });
    ch.sendToQueue(QUEUE, Buffer.from(msg));
    console.log("Sent invalid:", msg);
  }, 5 * 60 * 1000);

  ch.consume(QUEUE, async (msg) => {
    if (msg !== null) {
      const data = JSON.parse(msg.content.toString());
      const rules = await getRules();
      if (isInvalidData(data, rules)) {
        await csvWriter.writeRecords([
          {
            timestamp: data.timestamp,
            deviceId: data.deviceId,
            metric: data.type,
            value: data.value,
            ticket_status: "invalid",
            ticket_number: "",
            msg: JSON.stringify(data),
          },
        ]);
        await axios.post("http://localhost:4000/api/invalid-ticket", {
          deviceId: data.deviceId,
          metric: data.type,
          value: data.value,
          timestamp: data.timestamp,
          reason: !["temperature", "humidity"].includes(data.type)
            ? "Unknown metric"
            : "Out-of-range value",
        });
        ch.ack(msg);
        return;
      }

      const alarms = await getAlarms();
      const existingAlarm = alarms.find(
        (a) => a.deviceId === data.deviceId && a.category === data.type
      );

      const isAboveThreshold = checkRule(data.type, data.value, rules);

      let ticket_status = "none";
      let ticket_number = "";

      if (existingAlarm) {
        await axios.post("http://localhost:4000/api/alarms", {
          ...existingAlarm,
          status: isAboveThreshold ? "open" : "resolved",
          last_updated_at: data.timestamp,
          value: data.value,
          metric: data.type,
          timestamp: data.timestamp,
          config: rules,
        });
        ticket_status = isAboveThreshold ? "updated/open" : "resolved";
        ticket_number = existingAlarm.ticket_number;
      } else if (isAboveThreshold) {
        const res = await axios.post("http://localhost:4000/api/alarms", {
          ticket_number: Date.now(),
          name: `${
            data.type === "temperature" ? "Temperature Alert" : "Humidity Alert"
          } for Device ${data.deviceId}`,
          priority: data.type === "temperature" ? "high" : "medium",
          status: "open",
          site__display_name: "Demo Site",
          last_updated_at: data.timestamp,
          assignee__username: "system",
          deviceId: data.deviceId,
          category: data.type,
          config: rules,
          value: data.value,
          metric: data.type,
          timestamp: data.timestamp,
        });
        ticket_status = "generated";
        ticket_number = res.data.alarm?.ticket_number || "";
      } else {
        ticket_status = "no ticket";
      }

      // Write to CSV
      await csvWriter.writeRecords([
        {
          timestamp: data.timestamp,
          deviceId: data.deviceId,
          metric: data.type,
          value: data.value,
          ticket_status,
          ticket_number,
          msg: JSON.stringify(data),
        },
      ]);

      await axios.post("http://localhost:4000/api/telemetry", {
        deviceId: data.deviceId,
        metric: data.type,
        value: data.value,
        timestamp: data.timestamp,
      });

      ch.ack(msg);
    }
  });
}

start().catch(console.error);
