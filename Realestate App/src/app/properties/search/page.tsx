'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, DollarSign, Home, TrendingUp, Navigation } from 'lucide-react';

export default function PropertySearchPage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<'city' | 'zipcode' | 'address'>('city');
  const [searchParams, setSearchParams] = useState({
    city: '',
    state: '',
    zipcode: '',
    address: '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    propertyType: '',
  });
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);

  const handleGPSSearch = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Reverse geocode to get address
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const geocodeData = await geocodeResponse.json();

          // Extract address components
          const address = geocodeData.address;
          setSearchParams({
            ...searchParams,
            address: geocodeData.display_name || '',
            city: address.city || address.town || address.village || '',
            state: address.state || '',
            zipcode: address.postcode || '',
          });
          setSearchMode('address');

          // Automatically trigger search
          await handleSearch();
        } catch (error) {
          console.error('GPS error:', error);
          alert('Failed to get location. Please try again.');
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location. Please enable location services.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/properties/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: searchParams.city,
          state: searchParams.state,
          zipcode: searchParams.zipcode,
          address: searchParams.address,
          minPrice: searchParams.minPrice ? parseInt(searchParams.minPrice) : undefined,
          maxPrice: searchParams.maxPrice ? parseInt(searchParams.maxPrice) : undefined,
          minBedrooms: searchParams.minBedrooms ? parseInt(searchParams.minBedrooms) : undefined,
          propertyType: searchParams.propertyType || undefined,
          sources: ['zillow', 'realtor', 'facebook'],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeProperty = (property: any) => {
    // Save property data to localStorage for the analysis page
    localStorage.setItem(`property-${property.id}`, JSON.stringify(property));
    // Navigate to property detail page with analysis
    router.push(`/properties/${property.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Property Search</h1>
          <p className="text-sm text-gray-600">Find investment properties from multiple sources</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {/* Search Mode Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setSearchMode('city')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  searchMode === 'city'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                City/State
              </button>
              <button
                onClick={() => setSearchMode('zipcode')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  searchMode === 'zipcode'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ZIP Code
              </button>
              <button
                onClick={() => setSearchMode('address')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  searchMode === 'address'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Specific Address
              </button>
            </div>

            {/* GPS Button */}
            <button
              onClick={handleGPSSearch}
              disabled={gpsLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              <Navigation className="h-4 w-4" />
              <span>{gpsLoading ? 'Getting Location...' : 'Use My Location'}</span>
            </button>
          </div>

          {/* Search Inputs based on mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {searchMode === 'city' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={searchParams.city}
                    onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Austin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={searchParams.state}
                    onChange={(e) => setSearchParams({ ...searchParams, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>
              </>
            )}

            {searchMode === 'zipcode' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={searchParams.zipcode}
                  onChange={(e) => setSearchParams({ ...searchParams, zipcode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="78701"
                  maxLength={5}
                />
              </div>
            )}

            {searchMode === 'address' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Address
                </label>
                <input
                  type="text"
                  value={searchParams.address}
                  onChange={(e) => setSearchParams({ ...searchParams, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="123 Main St, Austin, TX 78701"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type
              </label>
              <select
                value={searchParams.propertyType}
                onChange={(e) => setSearchParams({ ...searchParams, propertyType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                <option value="SINGLE_FAMILY">Single Family</option>
                <option value="MULTI_FAMILY">Multi Family</option>
                <option value="CONDO">Condo</option>
                <option value="TOWNHOUSE">Townhouse</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Price
              </label>
              <input
                type="number"
                value={searchParams.minPrice}
                onChange={(e) => setSearchParams({ ...searchParams, minPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="200000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Price
              </label>
              <input
                type="number"
                value={searchParams.maxPrice}
                onChange={(e) => setSearchParams({ ...searchParams, maxPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="500000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Bedrooms
              </label>
              <input
                type="number"
                value={searchParams.minBedrooms}
                onChange={(e) => setSearchParams({ ...searchParams, minBedrooms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="3"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={
              loading ||
              (searchMode === 'city' && (!searchParams.city || !searchParams.state)) ||
              (searchMode === 'zipcode' && !searchParams.zipcode) ||
              (searchMode === 'address' && !searchParams.address)
            }
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Search className="h-5 w-5" />
            <span>{loading ? 'Searching...' : 'Search Properties'}</span>
          </button>
        </div>

        {/* Results */}
        {properties.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Found {properties.length} Properties
              </h2>
              <div className="text-sm text-gray-600">
                Sources: Zillow, Realtor.com, Facebook
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onAnalyze={() => analyzeProperty(property)}
                />
              ))}
            </div>
          </div>
        )}

        {properties.length === 0 && !loading && (
          <div className="text-center py-12">
            <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Enter search criteria above to find properties
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function PropertyCard({ property, onAnalyze }: { property: any; onAnalyze: () => void }) {
  const isAuction = property.metadata?.isAuction;
  const auctionType = property.metadata?.auctionType;
  const daysUntilAuction = property.metadata?.daysUntilAuction;
  const estimatedEquity = property.metadata?.estimatedEquity;
  const auctionDateFormatted = property.metadata?.auctionDateFormatted;

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition ${isAuction ? 'ring-2 ring-yellow-400' : ''}`}>
      {/* Property Image */}
      <div className="h-48 bg-gray-200 relative">
        {property.images && property.images[0] ? (
          <img
            src={property.images[0]}
            alt={property.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Home className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-indigo-600 text-white px-2 py-1 rounded text-xs font-semibold">
          {property.source}
        </div>
        {isAuction && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold flex items-center space-x-1">
            <span>⚡</span>
            <span>{auctionType}</span>
          </div>
        )}
        {isAuction && daysUntilAuction !== undefined && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
            {daysUntilAuction} days until auction
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">
            ${property.purchasePrice?.toLocaleString() || 'N/A'}
          </h3>
          <span className="text-sm text-gray-600">{property.propertyType}</span>
        </div>

        {/* Auction Info Banner */}
        {isAuction && estimatedEquity && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800 font-medium">Potential Equity:</span>
              <span className="text-green-900 font-bold">${estimatedEquity.toLocaleString()}</span>
            </div>
            {auctionDateFormatted && (
              <div className="text-xs text-green-700 mt-1">
                Auction: {auctionDateFormatted}
              </div>
            )}
          </div>
        )}

        <div className="flex items-start space-x-1 text-gray-700 mb-3">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            {property.address}, {property.city}, {property.state}
          </p>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
          <span>{property.bedrooms} beds</span>
          <span>{property.bathrooms} baths</span>
          {property.squareFeet && <span>{property.squareFeet.toLocaleString()} sqft</span>}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onAnalyze}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Analyze</span>
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <DollarSign className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
