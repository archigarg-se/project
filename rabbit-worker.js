import amqp from "amqplib";
import axios from "axios";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

const QUEUE = "telemetry";
const CSV_FILE = "messages_log.csv";

const SITES = [
  "Aerocity", "Delhi", "Mumbai", "Chennai", "Bangalore",
  "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Jaipur"
];
const ASSIGNEES = [
  "Archi", "Aryan", "Abhinav", "Tanvi", "Ridhima",
  "Aarav", "Divyam", "Shubham", "Ishaan", "Sara"
];
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
    { id: "site", title: "Site" },
    { id: "assignee", title: "Assignee" },
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
  const allowedMetrics = DEVICE_CONFIG[data.deviceId]?.metrics || [];
  if (!allowedMetrics.includes(data.type)) return true;
  if (!rules[data.deviceId] || !rules[data.deviceId][data.type]) return true;
  if (typeof data.value !== "number" || isNaN(data.value)) return true;
  return false;
}

async function start() {
  const conn = await amqp.connect("amqp://localhost:5672");
  const ch = await conn.createChannel();
  await ch.assertQueue(QUEUE);

  setInterval(async () => {
  const deviceIds = Object.keys(DEVICE_CONFIG);
  const deviceId = getRandom(deviceIds);
  const metrics = DEVICE_CONFIG[deviceId].metrics;

  let type, value;
  const isInvalid = Math.random() < 0.2; 

  if (isInvalid) {
    // INVALID: random wrong metric or alphabet value
    type = "invalid_metric_" + Math.floor(Math.random() * 100); 
    value = Math.random() < 0.5 ? "NaN" : "abc"; 
  } else {
    // VALID
    type = getRandom(metrics);
    value = Math.floor(Math.random() * 120);
  }

  const timestamp = new Date().toISOString();
  const site = getRandom(SITES);
  const assignee = getRandom(ASSIGNEES);
  const msg = JSON.stringify({ type, value, deviceId, timestamp, site, assignee });

  ch.sendToQueue(QUEUE, Buffer.from(msg));
  console.log("Sent:", msg);

  await axios.post("http://localhost:4000/api/telemetry", {
    deviceId,
    metric: type,
    value,
    timestamp,
    site,
    assignee,
  });
}, 10000);

  ch.consume(QUEUE, async (msg) => {
    if (msg !== null) {
      const data = JSON.parse(msg.content.toString());
      const rules = await getRules();
      if (isInvalidData(data, rules)) {
        // Just log or skip, do not call any endpoint
        await csvWriter.writeRecords([
          {
            timestamp: data.timestamp,
            deviceId: data.deviceId,
            metric: data.type,
            value: data.value,
            site: data.site,
            assignee: data.assignee,
            ticket_status: "invalid",
            ticket_number: "",
            msg: JSON.stringify(data),
          },
        ]);
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
          site: data.site,
          assignee: data.assignee,
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
          site: data.site,
          assignee: data.assignee,
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
          site: data.site,
          assignee: data.assignee,
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
        site: data.site,
        assignee: data.assignee,
      });

      ch.ack(msg);
    }
  });
}

start().catch(console.error);