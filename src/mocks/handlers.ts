import { http, HttpResponse } from 'msw';
const DEVICE_CONFIG: Record<string, { metrics: string[] }> = {
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

const SITES = [
  "Aerocity", "Delhi", "Mumbai", "Chennai", "Bangalore",
  "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Jaipur"
];
const ASSIGNEES = [
  "Archi", "Aryan", "Abhinav", "Tanvi", "Ridhima",
  "Aarav", "Divyam", "Shubham", "Ishaan", "Sara"
];
function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let rules: Record<string, Record<string, { operator: string; value: number }>> = {};
for (const deviceId in DEVICE_CONFIG) {
  rules[deviceId] = {};
  for (const metric of DEVICE_CONFIG[deviceId].metrics) {
    rules[deviceId][metric] = { operator: ">", value: 50 }; 
  }
}
let telemetryHistory: {
  deviceId: string;
  metric: string;
  value: number;
  timestamp: string;
  site?: string;
  assignee?: string;
}[] = [];

const mockAlarms: { alarms: any[] } = { alarms: [] };
const DEMO_USER = { username: "admin", password: "password" };

export const handlers = [
  http.post('/api/login', async ({ request }) => {
    const { username, password } = await request.json() as { username: string; password: string };
    if (username === DEMO_USER.username && password === DEMO_USER.password) {
      const token = "fake-jwt-token";
      return HttpResponse.json({ token, user: { username } });
    }
    return HttpResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }),

  http.get('/api/alarms', async ({ request }) => {
    const auth = request.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const token = auth.replace("Bearer ", "");
    if (token !== "fake-jwt-token") {
      return HttpResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return HttpResponse.json({ alarms: mockAlarms.alarms });
  }),
  
  http.get('/api/rules', async () => {
  return HttpResponse.json(rules as Record<string, Record<string, { operator: string; value: number }>>);
}),

  http.post('/api/rules', async ({ request }) => {
    rules = await request.json()as Record<string, Record<string, { operator: string; value: number }>>;
    return HttpResponse.json(rules);
  }),

  http.post('/api/telemetry', async ({ request }) => {
  const { deviceId, metric, value, timestamp ,site,assignee} = await request.json() as { deviceId: string; metric: string; value: number; timestamp: string; site: string; assignee: string};
  telemetryHistory.push({
    deviceId,
    metric,
    value,
    timestamp,
    site,
    assignee,
  });
  const cutoff = Date.now() - 60 * 60 * 1000;
  telemetryHistory = telemetryHistory.filter(
    (d) => new Date(d.timestamp).getTime() >= cutoff
  );
  return HttpResponse.json({ ok: true });
}),
  

http.get('/api/history', async ({ request }) => {
  const url = new URL(request.url);
  const deviceId = url.searchParams.get("deviceId");
  const metric = url.searchParams.get("metric");
  const cutoff = Date.now() - 60 * 60 * 1000;
  const history = telemetryHistory
    .filter(
      (d) =>
        d.deviceId === deviceId &&
        d.metric === metric &&
        new Date(d.timestamp).getTime() >= cutoff
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return HttpResponse.json(Array.isArray(history) ? history : []);
}),
  

  http.post('/api/alarms', async ({ request }) => {
    const body = await request.json() as {
      deviceId: string;
      metric: string;
      value: any;
      timestamp: string;
      site__display_name?: string;
      config: typeof rules;
      status?: string;
      comment?: string; 
      ticket_number?: number; 
    };
    const { deviceId, metric, value, site__display_name, config, status, comment, ticket_number } = body;

    // Find by ticket_number if provided, else by device/metric/status
    let alarm = ticket_number
      ? mockAlarms.alarms.find((a: any) => a.ticket_number === ticket_number)
      : mockAlarms.alarms.find(
          (a: any) => a.deviceId === deviceId && a.category === metric && a.status === "open"
        );

    // ...existing code...
    // --- RESOLVE LOGIC ---
    if (alarm && status === "resolved") {
      alarm.status = "resolved";
      alarm.last_updated_at = new Date().toISOString();
      if (comment) {
        alarm.comments = alarm.comments || [];
        alarm.comments.push(comment);
      }
      return HttpResponse.json({ alarm });
    }

    // --- AUTO-RESOLVE LOGIC BASED ON VALUE ---
    if (alarm) {
      const rule = rules[deviceId]?.[metric];
      let shouldBeOpen = false;
      if (rule) {
        switch (rule.operator) {
          case ">":
            shouldBeOpen = value > rule.value;
            break;
          case "<":
            shouldBeOpen = value < rule.value;
            break;
          case ">=":
            shouldBeOpen = value >= rule.value;
            break;
          case "<=":
            shouldBeOpen = value <= rule.value;
            break;
        }
      }
      if (!shouldBeOpen && alarm.status === "open") {
        alarm.status = "resolved";
        alarm.last_updated_at = new Date().toISOString();
        if (comment) {
          alarm.comments = alarm.comments || [];
          alarm.comments.push(comment);
        }
        return HttpResponse.json({ alarm });
      }
      // ...existing status change logic...
      if (["snoozed", "unsnoozed", "acknowledged"].includes(status || "")) {
        alarm.status = status;
        alarm.last_updated_at = new Date().toISOString();
        return HttpResponse.json({ alarm });
      }
      alarm.last_updated_at = new Date().toISOString();
      return HttpResponse.json({ alarm });
    }

    if (alarm && ["snoozed", "unsnoozed", "acknowledged"].includes(status || "")) {
      alarm.status = status;
      alarm.last_updated_at = new Date().toISOString();
      return HttpResponse.json({ alarm });
    }
    if (alarm) {
      alarm.last_updated_at = new Date().toISOString();
      return HttpResponse.json({ alarm });
    }
    const rule = rules[deviceId]?.[metric];
    let shouldCreate = false;
    if (rule) {
      switch (rule.operator) {
        case ">":
          shouldCreate = value > rule.value;
          break;
        case "<":
          shouldCreate = value < rule.value;
          break;
        case ">=":
          shouldCreate = value >= rule.value;
          break;
        case "<=":
          shouldCreate = value <= rule.value;
          break;
      }
    }

    if (shouldCreate) {
      const ticket_number = Math.floor(Math.random() * 1000000000);
      const now = new Date().toISOString();
      alarm = {
        ticket_number,
        name: `${metric.charAt(0).toUpperCase() + metric.slice(1)} Alert for Device ${deviceId}`,
        priority: "high",
        assignee__username: getRandom(ASSIGNEES),
        site__display_name: site__display_name || getRandom(SITES),
        last_updated_at: now,
        ticket_created_at: now,
        status: "open",
        category: metric,
        deviceId,
        config,
        value,
        metric,
        timestamp: now,
        comments: [],
      };
      mockAlarms.alarms.unshift(alarm);
      return HttpResponse.json({ alarm });
    }
    return HttpResponse.json({ message: "No ticket triggered" }, { status: 200 });
  }),

  http.post("/api/snooze", async ({ request }) => {
    const { ticket_number, comment } = await request.json() as { ticket_number: number; comment: string };
    const alarm = mockAlarms.alarms.find((a: any) => a.ticket_number === ticket_number);
    if (alarm) {
      alarm.status = "snoozed";
      alarm.comments = alarm.comments || [];
      alarm.comments.push(comment);
      alarm.last_updated_at = new Date().toISOString();
      return HttpResponse.json({ ok: true, alarm });
    }
    return HttpResponse.json({ ok: false, error: "Alarm not found" }, { status: 404 });
  }),
  http.post("/api/unsnooze", async ({ request }) => {
    const { ticket_number, comment } = await request.json() as { ticket_number: number; comment: string };
    const alarm = mockAlarms.alarms.find((a: any) => a.ticket_number === ticket_number);
    if (alarm) {
      alarm.status = "unsnoozed";
      alarm.comments = alarm.comments || [];
      alarm.comments.push(comment);
      alarm.last_updated_at = new Date().toISOString();
      return HttpResponse.json({ ok: true, alarm });
    }
    return HttpResponse.json({ ok: false, error: "Alarm not found" }, { status: 404 });
  }),
  http.post("/api/acknowledge", async ({ request }) => {
    const { ticket_number, comment } = await request.json() as { ticket_number: number; comment: string };
    const alarm = mockAlarms.alarms.find((a: any) => a.ticket_number === ticket_number);
    if (alarm) {
      alarm.status = "acknowledged";
      alarm.comments = alarm.comments || [];
      alarm.comments.push(comment);
      alarm.last_updated_at = new Date().toISOString();
      return HttpResponse.json({ ok: true, alarm });
    }
    return HttpResponse.json({ ok: false, error: "Alarm not found" }, { status: 404 });
  }),
];