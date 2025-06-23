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

export const DEVICE_CONFIG: DeviceConfig = {
  "device-1": {
    site: "Aerocity",
    metrics: ["temperature", "humidity"],
    assignee: "aero@site.com"
  },
  "device-2": {
    site: "Delhi",
    metrics: ["air_pressure", "exhaust"],
    assignee: "delhi@site.com"
  },
  "device-3": {
    site: "Mumbai",
    metrics: ["co2", "temperature"],
    assignee: "mumbai@site.com"
  },
  "device-4": {
    site: "Chennai",
    metrics: ["humidity", "exhaust"],
    assignee: "chennai@site.com"
  },
  "device-5": {
    site: "Bangalore",
    metrics: ["air_pressure", "co2"],
    assignee: "bangalore@site.com"
  },
  "device-6": {
    site: "Hyderabad",
    metrics: ["temperature", "humidity"],
    assignee: "hyd@site.com"
  },
  "device-7": {
    site: "Pune",
    metrics: ["exhaust", "co2"],
    assignee: "pune@site.com"
  },
  "device-8": {
    site: "Kolkata",
    metrics: ["temperature", "air_pressure"],
    assignee: "kolkata@site.com"
  },
  "device-9": {
    site: "Ahmedabad",
    metrics: ["humidity", "co2"],
    assignee: "ahd@site.com"
  },
  "device-10": {
    site: "Jaipur",
    metrics: ["exhaust", "air_pressure"],
    assignee: "jaipur@site.com"
  }
};