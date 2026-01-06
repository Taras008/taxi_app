'use client';

import { useState } from 'react';
import { convertNYToUTC, predictDemand, type PredictResponse } from '../lib/api';
import DateTimePicker from '../components/DateTimePicker';

type State = 'idle' | 'loading' | 'success' | 'error';

export default function Home() {
  const [state, setState] = useState<State>('idle');
  const [localDateTime, setLocalDateTime] = useState('');
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  const formatNYTime = (utcISO: string): { nyTime: string; utcISO: string } => {
    const date = new Date(utcISO);
    
    const nyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short',
    });
    
    const nyTimeStr = nyFormatter.format(date);
    const tzParts = tzFormatter.formatToParts(date);
    const tzAbbr = tzParts.find(p => p.type === 'timeZoneName')?.value || '';
    
    return {
      nyTime: `${nyTimeStr} (${tzAbbr})`,
      utcISO: utcISO,
    };
  };

  const calculateRideInterval = (demand: number): number | null => {
    if (demand <= 0) return null;
    return Math.round(3600 / demand);
  };

  const handlePredict = async () => {
    if (!localDateTime) {
      setError('Please select a date and time');
      return;
    }

    setState('loading');
    setError('');
    setResult(null);

    try {
      const utcISO = convertNYToUTC(localDateTime);
      
      const response = await predictDemand(utcISO);
      
      setResult(response);
      setState('success');
      setShowDetails(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get prediction');
      setState('error');
    }
  };

  const formatKeyValue = (obj: Record<string, number>): Array<{ key: string; value: number }> => {
    return Object.entries(obj)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => a.key.localeCompare(b.key));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            NYC Taxi Demand Prediction
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Predict hourly taxi demand in New York City
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
            Select Date & Time
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Choose a date and time in New York local time (EST/EDT)
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date & Time (New York)
              </label>
              <DateTimePicker
                value={localDateTime}
                onChange={setLocalDateTime}
                disabled={state === 'loading'}
              />
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              We convert your New York time to UTC for the model.
            </p>
            
            <button
              onClick={handlePredict}
              disabled={state === 'loading' || !localDateTime}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {state === 'loading' ? 'Predicting...' : 'Predict'}
            </button>
          </div>
        </div>

        {state === 'error' && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {state === 'success' && result && (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
                Prediction Result
              </h2>
              
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {result.demand.toFixed(1)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  rides per hour
                </div>
              </div>

              {calculateRideInterval(result.demand) && (
                <div className="text-center mb-6">
                  <div className="text-lg text-slate-700 dark:text-slate-300">
                    ≈ 1 ride every <span className="font-semibold">{calculateRideInterval(result.demand)}</span> seconds
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                {(() => {
                  const { nyTime, utcISO } = formatNYTime(result.target_datetime);
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">New York:</span>
                        <span className="text-sm text-slate-900 dark:text-slate-50">{nyTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">UTC:</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-slate-50">{utcISO}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Model Details
                </h3>
                <svg
                  className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDetails && (
                <div className="px-6 pb-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">
                      Warnings
                    </h4>
                    {result.warnings && result.warnings.length > 0 ? (
                      <div className="space-y-2">
                        {result.warnings.map((warning, idx) => (
                          <div
                            key={idx}
                            className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 flex items-start"
                          >
                            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">{warning}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">No warnings</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">
                      Weather Used
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {formatKeyValue(result.weather_used).map(({ key, value }) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{key}:</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">
                      Features Used
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {formatKeyValue(result.features_used).map(({ key, value }) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{key}:</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{value.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
