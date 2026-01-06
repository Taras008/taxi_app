
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export interface PredictRequest {
  target_datetime: string;
}

export interface PredictResponse {
  target_datetime: string;
  demand: number;
  unit: string;
  weather_used: Record<string, number>;
  features_used: Record<string, number>;
  warnings: string[];
}

export function convertNYToUTC(localDateTime: string): string {
  const [datePart, timePart] = localDateTime.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes = 0] = timePart.split(':').map(Number);
  
  const testUTC = new Date(Date.UTC(year, month - 1, day, 12, 0));
  
  const nyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
  });
  
  const nyTestHour = parseInt(nyFormatter.format(testUTC).split(':')[0]);
  
  const offsetHours = 12 - nyTestHour;
  
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours + offsetHours, minutes));
  
  return utcDate.toISOString();
}

export async function predictDemand(targetDatetimeUTC: string): Promise<PredictResponse> {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target_datetime: targetDatetimeUTC,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to get prediction';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

