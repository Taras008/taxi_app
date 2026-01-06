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
  
  let utcEstimate = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes));
  
  const nyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  for (let i = 0; i < 5; i++) {
    const nyFormatted = nyFormatter.format(utcEstimate);
    const nyParts = nyFormatted.split(', ');
    const nyDateParts = nyParts[0].split('/');
    const nyTimeParts = nyParts[1].split(':');
    
    const nyYear = parseInt(nyDateParts[2]);
    const nyMonth = parseInt(nyDateParts[0]);
    const nyDay = parseInt(nyDateParts[1]);
    const nyHour = parseInt(nyTimeParts[0]);
    const nyMinute = parseInt(nyTimeParts[1]);
    
    if (nyYear === year && nyMonth === month && nyDay === day && nyHour === hours && nyMinute === minutes) {
      return utcEstimate.toISOString();
    }
    
    const hourDiff = hours - nyHour;
    const minuteDiff = minutes - nyMinute;
    const totalDiffMinutes = hourDiff * 60 + minuteDiff;
    
    utcEstimate = new Date(utcEstimate.getTime() + totalDiffMinutes * 60 * 1000);
  }
  
  return utcEstimate.toISOString();
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

