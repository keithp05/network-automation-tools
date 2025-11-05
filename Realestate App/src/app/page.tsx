import Link from 'next/link';
import { Home, Search, TrendingUp, FileText, Wrench } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Home className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Real Estate Investor Platform</h1>
            </div>
            <nav className="flex space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link href="/signup" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                Sign Up
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-4">
            Your Complete Investment Solution
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find properties, analyze deals with AI, manage tenants, and grow your real estate portfolio—all in one platform
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            icon={<Search className="h-8 w-8 text-indigo-600" />}
            title="Multi-Source Property Search"
            description="Aggregate listings from Zillow, Realtor.com, Facebook Marketplace, and more"
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-indigo-600" />}
            title="AI-Powered Analysis"
            description="Get instant CMA reports, rental rate estimates, and market projections using advanced AI"
          />
          <FeatureCard
            icon={<FileText className="h-8 w-8 text-indigo-600" />}
            title="Automated Lease Generation"
            description="Generate professional lease agreements with legal compliance built-in"
          />
          <FeatureCard
            icon={<Wrench className="h-8 w-8 text-indigo-600" />}
            title="Tenant Portal"
            description="Let tenants report issues with photos, track maintenance, and communicate easily"
          />
          <FeatureCard
            icon={<Home className="h-8 w-8 text-indigo-600" />}
            title="Crime & Safety Data"
            description="Access police reports and safety statistics for any neighborhood"
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-indigo-600" />}
            title="Tenant Projections"
            description="Get AI-driven insights on tenant demographics and rental demand"
          />
        </div>

        {/* CTA Section */}
        <div className="bg-indigo-600 rounded-2xl p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Real Estate Business?</h3>
          <p className="text-xl mb-8 text-indigo-100">Join thousands of investors making smarter decisions</p>
          <Link
            href="/signup"
            className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">© 2024 Real Estate Investor Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
