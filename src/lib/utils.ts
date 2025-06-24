import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type DeviceConfig = {
  [deviceId: string]: {
    site: string;
    metrics: string[];
    assignee: string;
  };
};

const SITES = [
  "Aerocity", "Delhi", "Mumbai", "Chennai", "Bangalore",
  "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Jaipur"
];

const ASSIGNEES = [
  "Archi", "Aryan", "Abhinav", "Tanvi", "Ridhima",
  "Aarav", "Divyam", "Shubham", "Ishaan", "Sara"
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomDeviceConfig(): DeviceConfig {
  return {
    "device-1": {
      site: getRandom(SITES),
      metrics: ["temperature", "humidity"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-2": {
      site: getRandom(SITES),
      metrics: ["air_pressure", "exhaust"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-3": {
      site: getRandom(SITES),
      metrics: ["co2", "temperature"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-4": {
      site: getRandom(SITES),
      metrics: ["humidity", "exhaust"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-5": {
      site: getRandom(SITES),
      metrics: ["air_pressure", "co2"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-6": {
      site: getRandom(SITES),
      metrics: ["temperature", "humidity"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-7": {
      site: getRandom(SITES),
      metrics: ["exhaust", "co2"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-8": {
      site: getRandom(SITES),
      metrics: ["temperature", "air_pressure"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-9": {
      site: getRandom(SITES),
      metrics: ["humidity", "co2"],
      assignee: getRandom(ASSIGNEES)
    },
    "device-10": {
      site: getRandom(SITES),
      metrics: ["exhaust", "air_pressure"],
      assignee: getRandom(ASSIGNEES)
    }
  };
}