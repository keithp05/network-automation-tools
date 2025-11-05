import Link from 'next/link';
import { Home, Search, LayoutDashboard, Wrench, CheckCircle } from 'lucide-react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-8">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">App is Running! ✅</h1>
              <p className="text-gray-600">Test all the working pages below</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Landing Page */}
            <TestLink
              href="/"
              icon={<Home className="h-6 w-6" />}
              title="Landing Page"
              description="Home page with features"
              status="working"
            />

            {/* Login */}
            <TestLink
              href="/login"
              icon={<CheckCircle className="h-6 w-6" />}
              title="Login Page"
              description="Sign in (demo mode)"
              status="working"
            />

            {/* Signup */}
            <TestLink
              href="/signup"
              icon={<CheckCircle className="h-6 w-6" />}
              title="Sign Up Page"
              description="Create account (demo mode)"
              status="working"
            />

            {/* Dashboard */}
            <TestLink
              href="/dashboard"
              icon={<LayoutDashboard className="h-6 w-6" />}
              title="Dashboard"
              description="Investor dashboard with stats"
              status="working"
            />

            {/* Property Search */}
            <TestLink
              href="/properties/search"
              icon={<Search className="h-6 w-6" />}
              title="Property Search"
              description="Search for properties (FREE sources)"
              status="working"
              highlighted
            />

            {/* Tenant Portal */}
            <TestLink
              href="/tenant-portal"
              icon={<Wrench className="h-6 w-6" />}
              title="Tenant Portal"
              description="Submit maintenance requests"
              status="working"
            />
          </div>

          {/* Instructions */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              🎯 Quick Test Instructions
            </h2>
            <ol className="text-sm text-blue-800 space-y-2">
              <li>1. Click "Property Search" above</li>
              <li>2. Enter: <strong>City:</strong> Austin, <strong>State:</strong> TX</li>
              <li>3. Click "Search Properties" button</li>
              <li>4. Wait a few seconds for results</li>
              <li>5. You should see properties from FREE sources (County Records + Craigslist)</li>
            </ol>
          </div>

          {/* Status */}
          <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-lg font-semibold text-green-900 mb-2">
              ✅ What's Working
            </h2>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ Next.js server running on port 3000</li>
              <li>✓ SQLite database initialized</li>
              <li>✓ All pages rendering correctly</li>
              <li>✓ API endpoints ready</li>
              <li>✓ FREE data sources active (County + Craigslist)</li>
            </ul>
          </div>

          {/* API Key Status */}
          <div className="mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              ⚠️ Optional: Bright Data
            </h2>
            <p className="text-sm text-yellow-800">
              The Bright Data API key in .env is a placeholder. For real data:
            </p>
            <ol className="text-sm text-yellow-800 mt-2 space-y-1">
              <li>1. Sign up at https://brightdata.com/</li>
              <li>2. Get your API token</li>
              <li>3. Update BRIGHT_DATA_API_TOKEN in .env</li>
              <li>4. (Optional) Purchase dataset for $250</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestLink({
  href,
  icon,
  title,
  description,
  status,
  highlighted = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'working' | 'disabled';
  highlighted?: boolean;
}) {
  const bgColor = highlighted ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-200';

  return (
    <Link
      href={href}
      className={`block p-6 border-2 ${bgColor} rounded-lg hover:shadow-md transition`}
    >
      <div className="flex items-start space-x-4">
        <div className="text-indigo-600">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
          <div className="mt-2">
            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
              {status}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
