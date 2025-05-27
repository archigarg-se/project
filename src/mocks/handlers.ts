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
    const body = (await request.json()) as { deviceId: string; metric: string; value: number; timestamp: string;site__display_name:string};
    let shouldCreate = false;
    let ticketType = '';
    let priority = 'low';
    if (body.metric === 'temperature' && body.value > 70) {
      shouldCreate = true;
      ticketType = 'Temperature out of range';
      priority = 'high';
    }
    if (body.metric === 'humidity' && body.value > 90) {
      shouldCreate = true;
      ticketType = 'High Humidity';
      priority = 'medium';
    }
    if (!shouldCreate) {
      return HttpResponse.json({ message: 'No ticket triggered' }, { status: 200 });
    }
    const ticket_number = Math.floor(Math.random() * 1000000000);
    const now = new Date().toISOString();
    const alarm = {
      ticket_number,
      name: `${ticketType} for Device ${body.deviceId}`,
      priority,
      assignee__wattman_id: 0,
      assignee__username: "iot@system.com",
      site__timezone: "Asia/Kolkata",
      last_updated_at: now,
      ticket_created_at: now,
      escalation_level: 1,
      status: "open",
      site__client_name: "Client-01",
      site__display_name: `${body.site__display_name}`,
      rule_configuration__state_machine__name: null,
      acknowledged: false,
      queried_stream_paths: [],
      category: body.metric,
      device_path: [],
      device_display_name: [],
      device_type_display_name: []
    };
    mockAlarms.alarms.unshift(alarm);
    return HttpResponse.json({ alarm });
  }),
];