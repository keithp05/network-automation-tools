'use client';

import { useState } from 'react';
import { Search, TrendingUp, Home, FileText, Wrench, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats] = useState({
    totalProperties: 12,
    activeLeases: 8,
    monthlyRevenue: 24500,
    maintenanceRequests: 3,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Home className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Investor Dashboard</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/properties" className="text-gray-600 hover:text-gray-900">Properties</Link>
              <Link href="/tenants" className="text-gray-600 hover:text-gray-900">Tenants</Link>
              <Link href="/profile" className="text-gray-600 hover:text-gray-900">Profile</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Properties"
            value={stats.totalProperties}
            icon={<Home className="h-6 w-6 text-blue-600" />}
            color="blue"
          />
          <StatCard
            title="Active Leases"
            value={stats.activeLeases}
            icon={<FileText className="h-6 w-6 text-green-600" />}
            color="green"
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
            color="purple"
          />
          <StatCard
            title="Open Requests"
            value={stats.maintenanceRequests}
            icon={<Wrench className="h-6 w-6 text-orange-600" />}
            color="orange"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionButton
              href="/properties/search"
              icon={<Search className="h-5 w-5" />}
              label="Search Properties"
              description="Find new investment opportunities"
            />
            <ActionButton
              href="/properties/analyze"
              icon={<TrendingUp className="h-5 w-5" />}
              label="Analyze Deal"
              description="Run CMA and ROI analysis"
            />
            <ActionButton
              href="/lease/create"
              icon={<Plus className="h-5 w-5" />}
              label="Create Lease"
              description="Generate new lease agreement"
            />
          </div>
        </div>

        {/* Recent Properties */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Properties</h2>
          <div className="space-y-4">
            <PropertyRow
              address="123 Main St, Austin, TX"
              status="Analyzing"
              value="$385,000"
              rent="$2,400/mo"
            />
            <PropertyRow
              address="456 Oak Ave, Dallas, TX"
              status="Rented"
              value="$425,000"
              rent="$2,800/mo"
            />
            <PropertyRow
              address="789 Pine Rd, Houston, TX"
              status="Searching"
              value="$310,000"
              rent="$2,100/mo"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ href, icon, label, description }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
    >
      <div className="mt-1">{icon}</div>
      <div>
        <h3 className="font-semibold text-gray-900">{label}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </Link>
  );
}

function PropertyRow({ address, status, value, rent }: {
  address: string;
  status: string;
  value: string;
  rent: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div>
        <h3 className="font-semibold text-gray-900">{address}</h3>
        <p className="text-sm text-gray-600">Status: {status}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{rent}</p>
      </div>
    </div>
  );
}
