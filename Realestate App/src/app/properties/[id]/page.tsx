'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Home, TrendingUp, DollarSign, AlertCircle, CheckCircle, Calendar, Shield } from 'lucide-react';

interface CMAReport {
  propertyId: string;
  estimatedValue: number;
  valueRange: { low: number; high: number };
  pricePerSqft: number;
  comparables: any[];
  rentalComps: any[];
  estimatedRent: number;
  rentRange: { low: number; high: number };
  crimeScore: {
    overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
    scoreNumber: number;
    violentCrimeRate: number;
    propertyCrimeRate: number;
    comparison: string;
    nearbyIncidents: any[];
    recommendation: string;
  };
  aiAnalysis: {
    marketSummary: string;
    investmentPotential: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  };
  generatedAt: Date;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CMAReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPropertyAnalysis();
  }, [params.id]);

  async function loadPropertyAnalysis() {
    try {
      setLoading(true);

      // Check if property data was passed via localStorage
      const propertyDataStr = localStorage.getItem(`property-${params.id}`);
      let propertyData = null;

      if (propertyDataStr) {
        propertyData = JSON.parse(propertyDataStr);
        localStorage.removeItem(`property-${params.id}`); // Clean up
      }

      // Generate CMA report
      if (propertyData) {
        // Send property data to analysis endpoint
        const response = await fetch(`/api/properties/${params.id}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(propertyData),
        });
        const data = await response.json();

        if (data.success) {
          setReport(data.report);
        } else {
          setError(data.error);
        }
      } else {
        // Fallback to GET endpoint (will use demo data)
        const response = await fetch(`/api/properties/${params.id}/analyze`);
        const data = await response.json();

        if (data.success) {
          setReport(data.report);
        } else {
          setError(data.error);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getCrimeScoreColor = (score: string) => {
    switch (score) {
      case 'A': return 'text-green-600 bg-green-50 border-green-200';
      case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'D': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'F': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating AI-powered CMA Report...</p>
          <p className="text-sm text-gray-500 mt-2">Analyzing comps, rental data, and crime statistics</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Error Loading Report</h2>
          <p className="text-gray-600 text-center mb-4">{error || 'Failed to load property analysis'}</p>
          <button
            onClick={() => router.back()}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Search</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Property Analysis Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Estimated Value</h3>
              <Home className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${report.estimatedValue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              Range: ${report.valueRange.low.toLocaleString()} - ${report.valueRange.high.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Price/SqFt</h3>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${report.pricePerSqft}</p>
            <p className="text-xs text-gray-500 mt-1">Based on comparable sales</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Est. Monthly Rent</h3>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${report.estimatedRent.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              Range: ${report.rentRange.low.toLocaleString()} - ${report.rentRange.high.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Crime Score</h3>
              <Shield className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">{report.crimeScore.overallScore}</p>
              <p className="text-sm text-gray-500">({report.crimeScore.scoreNumber}/100)</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">{report.crimeScore.comparison}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Analysis */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <span>🤖</span>
                <span>AI-Powered Analysis</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Market Summary</h3>
                  <p className="text-gray-700">{report.aiAnalysis.marketSummary}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Investment Potential</h3>
                  <p className="text-gray-700">{report.aiAnalysis.investmentPotential}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Strengths</span>
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {report.aiAnalysis.strengths.map((strength, idx) => (
                      <li key={idx} className="text-gray-700">{strength}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span>Concerns</span>
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {report.aiAnalysis.concerns.map((concern, idx) => (
                      <li key={idx} className="text-gray-700">{concern}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-indigo-900 mb-2">Recommendation</h3>
                  <p className="text-indigo-800">{report.aiAnalysis.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Sales Comparables */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Comparables</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">$/SqFt</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bed/Bath</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.comparables.map((comp, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">{comp.address}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.distance} mi</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">${comp.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">${comp.pricePerSqft}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.bedrooms}/{comp.bathrooms}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.soldDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rental Comparables */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Rental Comparables</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Rent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">$/SqFt</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bed/Bath</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SqFt</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.rentalComps.map((comp, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">{comp.address}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.distance} mi</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">${comp.monthlyRent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">${comp.rentPerSqft}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.bedrooms}/{comp.bathrooms}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.squareFeet.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Crime Report */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Shield className="h-6 w-6 text-yellow-600" />
                <span>Crime Report</span>
              </h2>

              <div className={`border-2 rounded-lg p-4 mb-4 ${getCrimeScoreColor(report.crimeScore.overallScore)}`}>
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">{report.crimeScore.overallScore}</div>
                  <div className="text-sm font-medium mb-1">Safety Score: {report.crimeScore.scoreNumber}/100</div>
                  <div className="text-xs">{report.crimeScore.comparison}</div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Violent Crime Rate:</span>
                  <span className="text-sm font-semibold text-gray-900">{report.crimeScore.violentCrimeRate} per 1K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Property Crime Rate:</span>
                  <span className="text-sm font-semibold text-gray-900">{report.crimeScore.propertyCrimeRate} per 1K</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-700">{report.crimeScore.recommendation}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Incidents Nearby</h3>
                <div className="space-y-2">
                  {report.crimeScore.nearbyIncidents.slice(0, 5).map((incident, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs">
                      <Calendar className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">{incident.type}</div>
                        <div className="text-gray-500">{incident.distance} mi away • {incident.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Investment Calculator Preview */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="font-semibold text-indigo-900 mb-3">Investment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-indigo-700">Est. Purchase Price:</span>
                  <span className="font-semibold text-indigo-900">${report.estimatedValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-700">Est. Monthly Rent:</span>
                  <span className="font-semibold text-indigo-900">${report.estimatedRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-700">Est. Annual Income:</span>
                  <span className="font-semibold text-indigo-900">${(report.estimatedRent * 12).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-indigo-300">
                  <span className="text-indigo-700">Gross Yield:</span>
                  <span className="font-bold text-indigo-900">
                    {((report.estimatedRent * 12 / report.estimatedValue) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <button className="w-full mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">
                Full ROI Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
