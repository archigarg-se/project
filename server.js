import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

// Device configuration: metrics per device
const DEVICE_CONFIG = {
  "device-1": { metrics: { temperature: { operator: ">", value: 70 }, humidity: { operator: ">", value: 90 } } },
  "device-2": { metrics: { air_pressure: { operator: "<", value: 1000 }, exhaust: { operator: ">", value: 50 } } },
  "device-3": { metrics: { co2: { operator: ">", value: 400 }, temperature: { operator: "<", value: 15 } } },
  "device-4": { metrics: { humidity: { operator: "<", value: 30 }, exhaust: { operator: ">", value: 60 } } },
  "device-5": { metrics: { air_pressure: { operator: ">", value: 1100 }, co2: { operator: "<", value: 350 } } },
  "device-6": { metrics: { temperature: { operator: ">", value: 45 }, humidity: { operator: "<", value: 20 } } },
  "device-7": { metrics: { exhaust: { operator: "<", value: 10 }, co2: { operator: ">", value: 500 } } },
  "device-8": { metrics: { temperature: { operator: "<", value: 10 }, air_pressure: { operator: ">", value: 1200 } } },
  "device-9": { metrics: { humidity: { operator: ">", value: 95 }, co2: { operator: "<", value: 300 } } },
  "device-10": { metrics: { exhaust: { operator: ">", value: 80 }, air_pressure: { operator: "<", value: 900 } } },
};

// --- THIS FUNCTION PREVENTS INVALID DATA FROM CREATING TICKETS ---
function isInvalidData(deviceId, metric, value, rules) {
  const allowedMetrics = Object.keys(DEVICE_CONFIG[deviceId]?.metrics || {});
  if (!allowedMetrics.includes(metric)) return true;
  if (!rules[deviceId] || !rules[deviceId][metric]) return true;
  if (typeof value !== "number" || isNaN(value)) return true;
  return false;
}

// Rules object (copied from DEVICE_CONFIG at startup, can be changed via API)
let rules = {};
for (const deviceId in DEVICE_CONFIG) {
  rules[deviceId] = { ...DEVICE_CONFIG[deviceId].metrics };
}

let alarms = [];

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function sendMail(subject, text) {
  if (!EMAIL_ENABLED) return;
  await transporter.sendMail({
    from: EMAIL_USER,
    to: EMAIL_USER,
    subject,
    text,
  });
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "password") {
    return res.json({ token: "fake-jwt-token", user: { username } });
  }
  res.status(401).json({ message: "Invalid credentials" });
});

app.get("/api/alarms", (req, res) => {
  res.json({ alarms });
});

app.post("/api/alarms", async (req, res) => {
  const now = new Date().toISOString();
  // Find existing alarm for device/metric
  const alarmIdx = alarms.findIndex(
    (a) => a.deviceId === req.body.deviceId && a.category === req.body.metric
  );

  // Use provided site/assignee if present, else randomize (for backward compatibility)
  const site__display_name = req.body.site__display_name || req.body.site || getRandom(SITES);
  const assignee__username = req.body.assignee__username || req.body.assignee || getRandom(ASSIGNEES);

  if (alarmIdx !== -1) {
    // Update status and info, never create a new ticket for same device/metric
    const wasOpen = alarms[alarmIdx].status === "open";
    alarms[alarmIdx] = {
      ...alarms[alarmIdx],
      ...req.body,
      site__display_name,
      assignee__username,
      last_updated_at: req.body.timestamp || now,
      status: req.body.status || alarms[alarmIdx].status,
    };
    // Send mail if resolved
    if (wasOpen && req.body.status === "resolved") {
      await sendMail(
        "Alarm Resolved",
        `Alarm ticket ${alarms[alarmIdx].ticket_number} has been resolved.\nDevice: ${alarms[alarmIdx].deviceId}\nMetric: ${alarms[alarmIdx].metric}\nTimestamp: ${alarms[alarmIdx].last_updated_at}`
      );
    }
    return res.json({ alarm: alarms[alarmIdx] });
  }
  if (isInvalidData(req.body.deviceId, req.body.metric, req.body.value, rules)) {
    // No ticket, just skip
    return res.json({ message: "Invalid data, no ticket generated" });
  }
  // Otherwise, create new alarm
  const alarm = {
    ticket_number: Date.now(),
    name:
      req.body.name ||
      `${req.body.metric ? req.body.metric.charAt(0).toUpperCase() + req.body.metric.slice(1) : "Metric"} Alert for ${req.body.deviceId}`,
    priority: req.body.priority || "high",
    status: req.body.status || "open",
    site__display_name,
    last_updated_at: req.body.timestamp || now,
    assignee__username,
    deviceId: req.body.deviceId,
    category: req.body.metric,
    config: req.body.config,
    value: req.body.value,
    metric: req.body.metric,
    timestamp: req.body.timestamp || now,
    comments: [],
  };
  alarms.unshift(alarm);

  // Send email for alarm creation
  await sendMail(
    "New Alarm Ticket Created",
    `Alarm ticket created:\n Device: ${alarm.deviceId}\nMetric: ${alarm.metric}\nValue: ${alarm.value}\nTimestamp: ${alarm.timestamp}\nSite: ${alarm.site__display_name}\nAssignee: ${alarm.assignee__username}`
  );

  res.json({ alarm });
});

app.get("/api/rules", (req, res) => {
  res.json(rules);
});

app.post("/api/rules", (req, res) => {
  rules = req.body;
  res.json(rules);
});

app.get("/api/device-config", (req, res) => {
  res.json(DEVICE_CONFIG);
});

// SNOOZE ENDPOINT
app.post("/api/snooze", async (req, res) => {
  const { ticket_number, comment } = req.body;
  const alarm = alarms.find((a) => a.ticket_number === ticket_number);
  if (alarm) {
    alarm.status = "snoozed";
    alarm.comments = alarm.comments || [];
    alarm.comments.push(comment);
    alarm.last_updated_at = new Date().toISOString();
    await sendMail(
      "Alarm Snoozed",
      `Alarm ${ticket_number} was snoozed.\nComment: ${comment || ""}`
    );
    res.json({ ok: true, alarm });
  } else {
    res.status(404).json({ ok: false, error: "Alarm not found" });
  }
});

// UNSNOOZE ENDPOINT
app.post("/api/unsnooze", async (req, res) => {
  const { ticket_number, comment } = req.body;
  const alarm = alarms.find((a) => a.ticket_number === ticket_number);
  if (alarm) {
    alarm.status = "un-snoozed";
    alarm.comments = alarm.comments || [];
    alarm.comments.push(comment);
    alarm.last_updated_at = new Date().toISOString();
    await sendMail(
      "Alarm Unsnoozed",
      `Alarm ${ticket_number} was unsnoozed.\nComment: ${comment || ""}`
    );
    res.json({ ok: true, alarm });
  } else {
    res.status(404).json({ ok: false, error: "Alarm not found" });
  }
});

// ACKNOWLEDGE ENDPOINT
app.post("/api/acknowledge", async (req, res) => {
  const { ticket_number, comment } = req.body;
  const alarm = alarms.find((a) => a.ticket_number === ticket_number);
  if (alarm) {
    alarm.status = "acknowledged";
    alarm.comments = alarm.comments || [];
    alarm.comments.push(comment);
    alarm.last_updated_at = new Date().toISOString();
    await sendMail(
      "Alarm Acknowledged",
      `Alarm ${ticket_number} was acknowledged.\nComment: ${comment || ""}`
    );
    res.json({ ok: true, alarm });
  } else {
    res.status(404).json({ ok: false, error: "Alarm not found" });
  }
});

let telemetryHistory = []; 

app.post("/api/telemetry", async (req, res) => {
  const { deviceId, metric, value, timestamp, site, assignee } = req.body;
  telemetryHistory.push({ deviceId, metric, value, timestamp, site, assignee });
  const cutoff = Date.now() - 60 * 60 * 1000;
  telemetryHistory = telemetryHistory.filter(
    (d) => new Date(d.timestamp).getTime() >= cutoff
  );

  if (isInvalidData(deviceId, metric, value, rules)) {
    await sendMail(
      "Invalid Data Detected",
      `Device: ${deviceId}\nMetric: ${metric}\nValue: ${value}\nTimestamp: ${timestamp}\nSite: ${site}\nAssignee: ${assignee}`
    );
  }

  res.json({ ok: true });
});

app.get("/api/history", (req, res) => {
  const { deviceId, metric } = req.query;
  const cutoff = Date.now() - 60 * 60 * 1000;
  const history = telemetryHistory
    .filter(
      (d) =>
        d.deviceId === deviceId &&
        d.metric === metric &&
        new Date(d.timestamp).getTime() >= cutoff
    )
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  res.json(Array.isArray(history) ? history : []);
});

app.listen(4000, () => console.log("Backend running on http://localhost:4000"));