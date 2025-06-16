## Manual Mode (MSW)
- Run: `pnpm run dev`
- Use the manual form to create alarms.

## Automatic Mode (Express + RabbitMQ)
- Run: `pnpm run dev --mode automatic`
- In another terminal: `node server.js`
- In another terminal: `node rabbit-worker.js`
- Alarms will appear automatically.