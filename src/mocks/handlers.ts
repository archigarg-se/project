import { http, HttpResponse } from 'msw';

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
      category: "environment",
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
      category: "environment",
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

export const handlers = [
  http.get('/api/alarms', () => {
    return HttpResponse.json(mockAlarms);
  }),
    http.post('/api/alarms', async ({ request }) => {
  const body = await request.json() as {
    deviceId: string;
    metric: string;
    value: number;
    timestamp: string;
    site__display_name: string;
    config: {
      temperature: { operator: string; value: number };
      humidity: { operator: string; value: number };
    };
  };
  const { deviceId, metric, value, timestamp, site__display_name, config } = body;

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
      assignee__username: "iot@system.com",
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