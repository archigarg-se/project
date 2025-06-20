import { http, HttpResponse } from 'msw';

let rules = {
  temperature: { operator: '>', value: 70 },
  humidity: { operator: '>', value: 90 },
};

let telemetryHistory: { deviceId: string; metric: string; value: number; timestamp: string }[] = [];

const mockAlarms = {
  alarms: [
    {
      ticket_number: 100007206,
      name: "Temperature out of range for Main Kitchen Deep Freezer at Aerocity",
      priority: "low",
      assignee__wattman_id: 8145,
      assignee__username: "abc@def.com",
      site__timezone: "Asia/Kolkata",
      last_updated_at: "2025-05-20T06:52:09.466903Z",
      ticket_created_at: "2025-05-15T07:15:55.976009Z",
      escalation_level: 2,
      status: "open",
      site__client_name: "Client-01",
      site__display_name: "Aerocity",
      rule_configuration__state_machine__name: null,
      acknowledged: true,
      queried_stream_paths: [
        "/Client-03/Wireless2/Temperature",
        "/Client-03/Meter1/Current"
      ],
      category: "temperature", // <--- ADD THIS
      deviceId: "device-1",    // <--- ADD THIS
      device_path: [
        "/Client-03/Meter1",
        "/Client-03/Wireless2"
      ],
      device_display_name: [
        "Main Kitchen Deep Freezer",
        "Main Kitchen Walkin - Freezer"
      ],
      device_type_display_name: [
        "Meter",
        "Wireless"
      ]
    },
    {
      ticket_number: 100002435,
      name: "VoltageLL out of ideal range for EB at Viman nagar",
      priority: "low",
      assignee__wattman_id: 8145,
      assignee__username: "xyz@def.com",
      site__timezone: "Asia/Kolkata",
      last_updated_at: "2025-05-26T03:51:09.466903Z",
      ticket_created_at: "2025-05-13T07:15:55.976009Z",
      escalation_level: 2,
      status: "open",
      site__client_name: "Client-02",
      site__display_name: "Viman Nagar",
      rule_configuration__state_machine__name: null,
      acknowledged: true,
      queried_stream_paths: [
        "/Client-03/Wireless2/Temperature",
        "/Client-03/Meter1/Current"
      ],
      category: "humidity", // <--- ADD THIS (or "voltage" if you want)
      deviceId: "device-2", // <--- ADD THIS
      device_path: [
        "/Client-03/Meter1",
        "/Client-03/Wireless2"
      ],
      device_display_name: [
        "Main Kitchen Deep Freezer",
        "Main Kitchen Walkin - Freezer"
      ],
      device_type_display_name: [
        "Meter",
        "Wireless"
      ]
    }
  ],
  next: null,
  previous: null
};

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
    return HttpResponse.json(mockAlarms);
  }),

  http.get('/api/rules', async () => {
    return HttpResponse.json(rules);
  }),

  http.post('/api/telemetry', async ({ request }) => {
    const { deviceId, metric, value, timestamp } = await request.json() as{ deviceId: string; metric: string; value: number; timestamp: string };
    telemetryHistory.push({ deviceId, metric, value, timestamp });
    // Keep only last 60 minutes
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

  http.post('/api/rules', async ({ request }) => {
    rules = await request.json() as {
  temperature: { operator: '>', value: 70 },
  humidity: { operator: '>', value: 90 },
};
    return HttpResponse.json(rules);
  }),

  http.post('/api/alarms', async ({ request }) => {
    const body = await request.json() as {
      deviceId: string;
      metric: string;
      value: number;
      timestamp: string;
      site__display_name: string;
      config: typeof rules;
    };
    const { deviceId, metric, value, site__display_name, config } = body;

    const existing = mockAlarms.alarms.find(
      (a: any) =>
        a.deviceId === deviceId && a.category === metric && a.status === "open"
    );

    let shouldCreate = false;
    let ticketType = '';
    let priority = 'low';

    if (
      metric === 'temperature' &&
      eval(`${value} ${config.temperature.operator} ${config.temperature.value}`)
    ) {
      shouldCreate = true;
      ticketType = 'Temperature Alert';
      priority = 'high';
    }
    if (
      metric === 'humidity' &&
      eval(`${value} ${config.humidity.operator} ${config.humidity.value}`)
    ) {
      shouldCreate = true;
      ticketType = 'Humidity Alert';
      priority = 'medium';
    }

    if (!shouldCreate && existing) {
      existing.status = "resolved";
      existing.last_updated_at = new Date().toISOString();
      return HttpResponse.json({ alarm: existing });
    }

    if (shouldCreate && existing) {
      existing.last_updated_at = new Date().toISOString();
      return HttpResponse.json({ alarm: existing });
    }

    if (shouldCreate && !existing) {
      const ticket_number = Math.floor(Math.random() * 1000000000);
      const now = new Date().toISOString();
      const alarm = {
        ticket_number,
        name: `${ticketType} for Device ${deviceId}`,
        priority,
        assignee__wattman_id: 0,
        assignee__username: "abc@def.com",
        site__timezone: "Asia/Kolkata",
        last_updated_at: now,
        ticket_created_at: now,
        escalation_level: 1,
        status: "open",
        site__client_name: "Client-01",
        site__display_name: site__display_name || `Device ${deviceId}`,
        rule_configuration__state_machine__name: null,
        acknowledged: false,
        queried_stream_paths: [],
        category: metric,
        deviceId,
        device_path: [],
        device_display_name: [],
        config,
        device_type_display_name: []
      };
      mockAlarms.alarms.unshift(alarm);
      return HttpResponse.json({ alarm });
    }

    return HttpResponse.json({ message: 'No ticket triggered' }, { status: 200 });
  }),
];