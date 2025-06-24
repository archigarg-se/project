import React from 'react';
import { buttonVariants } from './ui/button';
import axios from "axios";
import { useAlarmFormStore } from "../stores/alarmForm";

import { getRandomDeviceConfig } from "../lib/utils";


type AlarmFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  config: any;
};

const AlarmForm: React.FC<AlarmFormProps> = ({ onClose, onSuccess, config }) => {
  const DEVICE_CONFIG = getRandomDeviceConfig();
  const {
    form,
    loading,
    error,
    setForm,
    resetForm,
    setLoading,
    setError,
  } = useAlarmFormStore();

  React.useEffect(() => {
    resetForm();
  }, [resetForm]);

  // Get metrics for selected device
  const metrics = DEVICE_CONFIG[form.deviceId]?.metrics || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        deviceId: form.deviceId,
        metric: form.metric,
        value: Number(form.value),
        timestamp: form.timestamp,
        site__display_name: DEVICE_CONFIG[form.deviceId]?.site,
        config,
      };
      const res = await fetch('/api/alarms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!text) {
        setError('No response from server');
        setLoading(false);
        return;
      }
      const data = JSON.parse(text);

      if (data.alarm) {
        await axios.post("/api/telemetry", {
          deviceId: form.deviceId,
          metric: form.metric,
          value: Number(form.value),
          timestamp: form.timestamp,
        });
        onSuccess();
        resetForm();
      } else {
        setError(data.message || 'No ticket triggered');
      }
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Simulate Telemetry</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            name="deviceId"
            value={form.deviceId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="">Select Device</option>
            {Object.keys(DEVICE_CONFIG).map((deviceId) => (
              <option key={deviceId} value={deviceId}>
                {deviceId}
              </option>
            ))}
          </select>
          <select
            name="metric"
            value={form.metric}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
            disabled={!form.deviceId}
          >
            <option value="">Select Metric</option>
            {metrics.map((metric: string) => (
              <option key={metric} value={metric}>{metric}</option>
            ))}
          </select>
          <input
            name="value"
            placeholder="Value"
            type="number"
            value={form.value}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            name="timestamp"
            placeholder="Timestamp"
            type="datetime-local"
            value={form.timestamp}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          {error && <div className="text-red-600">{error}</div>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => { onClose(); resetForm(); }}
              className="px-4 py-2 bg-gray-300 rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className={buttonVariants({ variant: 'outline', size: 'default' })}   
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AlarmForm;