import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let alarms = [];
let rules = {
  temperature: { operator: '>', value: 70 },
  humidity: { operator: '>', value: 90 },
};

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

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "password") {
    return res.json({ token: "fake-jwt-token", user: { username } });
  }
  res.status(401).json({ message: "Invalid credentials" });
});

app.get('/api/alarms', (req, res) => {
  res.json({ alarms });
});

app.post('/api/alarms', async (req, res) => {
  const now = new Date().toISOString();
  // Find existing alarm for device/metric
  const alarmIdx = alarms.findIndex(
    (a) =>
      a.deviceId === req.body.deviceId &&
      a.category === req.body.metric
  );

  if (alarmIdx !== -1) {
    // Update status and info, never create a new ticket for same device/metric
    alarms[alarmIdx] = {
      ...alarms[alarmIdx],
      ...req.body,
      last_updated_at: req.body.timestamp || now,
      status: req.body.status || alarms[alarmIdx].status,
    };
    return res.json({ alarm: alarms[alarmIdx] });
  }

  // Otherwise, create new alarm
  const alarm = {
    ticket_number: Date.now(),
    name: req.body.name || `${req.body.metric === 'temperature' ? 'Temperature Alert' : 'Humidity Alert'} for Device ${req.body.deviceId}`,
    priority: req.body.priority || (req.body.metric === 'temperature' ? 'high' : 'medium'),
    status: req.body.status || 'open',
    site__display_name: req.body.site__display_name || 'Demo Site',
    last_updated_at: req.body.timestamp || now,
    assignee__username: req.body.assignee__username || 'system',
    deviceId: req.body.deviceId,
    category: req.body.metric,
    config: req.body.config,
    value: req.body.value,
    metric: req.body.metric,
    timestamp: req.body.timestamp || now,
    comments: [],
  };
  alarms.unshift(alarm);
  res.json({ alarm });
});

app.get('/api/rules', (req, res) => {
  res.json(rules);
});

app.post('/api/rules', (req, res) => {
  rules = req.body;
  res.json(rules);
});

// SNOOZE ENDPOINT
app.post("/api/snooze", async (req, res) => {
  const { ticket_number, comment } = req.body;
  const alarm = alarms.find(a => a.ticket_number === ticket_number);
  if (alarm) {
    alarm.status = "snoozed";
    alarm.comments = alarm.comments || [];
    alarm.comments.push(comment);
    alarm.last_updated_at = new Date().toISOString();
    res.json({ ok: true, alarm });
  } else {
    res.status(404).json({ ok: false, error: "Alarm not found" });
  }
});

let telemetryHistory = []; // { deviceId, metric, value, timestamp }

// TELEMETRY ENDPOINT (send email here)
app.post('/api/telemetry', async (req, res) => {
  const { deviceId, metric, value, timestamp } = req.body;
  telemetryHistory.push({ deviceId, metric, value, timestamp });
  // Keep only last 60 minutes
  const cutoff = Date.now() - 60 * 60 * 1000;
  telemetryHistory = telemetryHistory.filter(
    (d) => new Date(d.timestamp).getTime() >= cutoff
  );
  // Send email
  await sendMail(
    `Telemetry Data Received: ${metric}`,
    `Device: ${deviceId}\nMetric: ${metric}\nValue: ${value}\nTimestamp: ${timestamp}`
  );
  res.json({ ok: true });
});

app.get('/api/history', (req, res) => {
  const { deviceId, metric } = req.query;
  const cutoff = Date.now() - 60 * 60 * 1000;
  const history = telemetryHistory
    .filter(
      (d) =>
        d.deviceId === deviceId &&
        d.metric === metric &&
        new Date(d.timestamp).getTime() >= cutoff
    )
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  res.json(Array.isArray(history) ? history : []);
});

app.listen(4000, () => console.log('Backend running on http://localhost:4000'));