import amqp from "amqplib";
import axios from "axios";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

const QUEUE = "telemetry";
const CSV_FILE = "messages_log.csv";

const DEVICE_CONFIG = {
  "device-1": { metrics: ["temperature", "humidity"] },
  "device-2": { metrics: ["air_pressure", "exhaust"] },
  "device-3": { metrics: ["co2", "temperature"] },
  "device-4": { metrics: ["humidity", "exhaust"] },
  "device-5": { metrics: ["air_pressure", "co2"] },
  "device-6": { metrics: ["temperature", "humidity"] },
  "device-7": { metrics: ["exhaust", "co2"] },
  "device-8": { metrics: ["temperature", "air_pressure"] },
  "device-9": { metrics: ["humidity", "co2"] },
  "device-10": { metrics: ["exhaust", "air_pressure"] },
};

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
  append: fs.existsSync(CSV_FILE),
});

async function getRules() {
  const { data } = await axios.get("http://localhost:4000/api/rules");
  return data;
}

async function getAlarms() {
  const { data } = await axios.get("http://localhost:4000/api/alarms");
  return data.alarms;
}

function checkRule(deviceId, type, value, rules) {
  const rule = rules[deviceId]?.[type];
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
  // Only allow metrics defined for the device
  const allowedMetrics = DEVICE_CONFIG[data.deviceId]?.metrics || [];
  if (!allowedMetrics.includes(data.type)) return true;
  // Check if rule exists for this device and metric
  if (!rules[data.deviceId] || !rules[data.deviceId][data.type]) return true;
  return false;
}

async function start() {
  const conn = await amqp.connect("amqp://localhost:5672");
  const ch = await conn.createChannel();
  await ch.assertQueue(QUEUE);

  setInterval(async () => {
    // Pick a random device and metric
    const deviceIds = Object.keys(DEVICE_CONFIG);
    const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
    const metrics = DEVICE_CONFIG[deviceId].metrics;
    const type = metrics[Math.floor(Math.random() * metrics.length)];
    const value = Math.floor(Math.random() * 120);
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
  }, 10000);

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
          reason: "Invalid metric for device",
        });
        ch.ack(msg);
        return;
      }

      const alarms = await getAlarms();
      const existingAlarm = alarms.find(
        (a) => a.deviceId === data.deviceId && a.category === data.type
      );

      const isAboveThreshold = checkRule(data.deviceId, data.type, data.value, rules);
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
          deviceId: data.deviceId,
          metric: data.type,
          value: data.value,
          timestamp: data.timestamp,
          config: rules,
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