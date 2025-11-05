'use client';

import { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function QuickTestPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setTesting(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 Testing San Antonio, TX property search...');

      const response = await fetch('/api/properties/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'San Antonio',
          state: 'TX',
          minPrice: 200000,
          maxPrice: 500000,
          minBedrooms: 3,
        }),
      });

      const data = await response.json();

      console.log('✅ API Response:', data);
      setResult(data);

      if (!data.success) {
        setError(data.error || 'Search failed');
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🏡 Property Search Test
            </h1>
            <p className="text-gray-600">
              Testing search for San Antonio, TX
            </p>
          </div>

          {/* Test Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={runTest}
              disabled={testing}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-3 text-lg font-semibold"
            >
              {testing ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-6 w-6" />
                  <span>Run Property Search</span>
                </>
              )}
            </button>
          </div>

          {/* Search Parameters */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Search Parameters:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">City:</span>
                <span className="ml-2 font-semibold">San Antonio</span>
              </div>
              <div>
                <span className="text-gray-600">State:</span>
                <span className="ml-2 font-semibold">TX</span>
              </div>
              <div>
                <span className="text-gray-600">Min Price:</span>
                <span className="ml-2 font-semibold">$200,000</span>
              </div>
              <div>
                <span className="text-gray-600">Max Price:</span>
                <span className="ml-2 font-semibold">$500,000</span>
              </div>
              <div>
                <span className="text-gray-600">Min Bedrooms:</span>
                <span className="ml-2 font-semibold">3</span>
              </div>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="mb-6">
              {result.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-900">
                      Search Successful!
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm text-green-800">
                    <p><strong>Found:</strong> {result.count} properties</p>
                    <p><strong>Sources:</strong></p>
                    <ul className="ml-4 list-disc">
                      <li>County Records (FREE)</li>
                      <li>Craigslist (FREE)</li>
                      <li>Bright Data (if API key is valid)</li>
                    </ul>
                  </div>

                  {/* Property List */}
                  {result.properties && result.properties.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Sample Properties:</h4>
                      <div className="space-y-2">
                        {result.properties.slice(0, 3).map((prop: any, idx: number) => (
                          <div key={idx} className="bg-white rounded p-3 text-xs">
                            <div className="font-semibold">{prop.address}</div>
                            <div className="text-gray-600">
                              ${prop.purchasePrice?.toLocaleString()} • {prop.bedrooms} beds • {prop.source}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.properties && result.properties.length === 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> No properties found for this search.
                        This is normal if:
                        <ul className="ml-4 mt-2 list-disc">
                          <li>Bright Data API key is not configured (expected)</li>
                          <li>County/Craigslist don't have data for San Antonio yet</li>
                          <li>Try searching for Austin, Houston, or Phoenix instead</li>
                        </ul>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <XCircle className="h-6 w-6 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-900">
                      Search Failed
                    </h3>
                  </div>
                  <p className="text-sm text-red-800">{result.error || 'Unknown error'}</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Error</h3>
              </div>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 What This Tests:</h3>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>API endpoint is working</li>
              <li>Property aggregator service is functional</li>
              <li>Database connection is OK</li>
              <li>FREE data sources (County + Craigslist) are active</li>
            </ul>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Next:</strong> Go to{' '}
                <a href="/properties/search" className="underline font-semibold">
                  /properties/search
                </a>{' '}
                to use the full search interface.
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Remember:</strong> You must enter BOTH City and State for the button to work!
              </p>
            </div>
          </div>

          {/* Debug Info */}
          {result && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                View Raw Response (for debugging)
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
