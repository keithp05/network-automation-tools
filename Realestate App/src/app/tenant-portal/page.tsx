'use client';

import { useState } from 'react';
import { Camera, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function TenantPortalPage() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('priority', formData.priority);
    formDataToSend.append('propertyId', 'property-123'); // TODO: Get from context
    formDataToSend.append('tenantId', 'tenant-456'); // TODO: Get from auth

    selectedImages.forEach((image) => {
      formDataToSend.append('images', image);
    });

    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        alert('Maintenance request submitted successfully!');
        setShowRequestForm(false);
        setFormData({ title: '', description: '', priority: 'MEDIUM' });
        setSelectedImages([]);
      }
    } catch (error) {
      alert('Failed to submit request');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Tenant Portal</h1>
          <p className="text-sm text-gray-600">123 Main St, Austin, TX 78701</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lease Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lease Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Monthly Rent</p>
              <p className="text-lg font-semibold text-gray-900">$2,400</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lease Ends</p>
              <p className="text-lg font-semibold text-gray-900">Dec 31, 2024</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next Payment Due</p>
              <p className="text-lg font-semibold text-gray-900">Nov 1, 2024</p>
            </div>
          </div>
        </div>

        {/* Maintenance Requests Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Maintenance Requests</h2>
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              {showRequestForm ? 'Cancel' : 'New Request'}
            </button>
          </div>

          {/* New Request Form */}
          {showRequestForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Leaky faucet in kitchen"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Describe the issue in detail..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Photos
                </label>
                <div className="flex items-center space-x-4">
                  <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Choose Photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {selectedImages.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedImages.length} photo(s) selected
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
              >
                <Send className="h-5 w-5" />
                <span>Submit Request</span>
              </button>
            </form>
          )}

          {/* Existing Requests */}
          <div className="space-y-4">
            <MaintenanceRequestCard
              title="Leaky faucet in kitchen"
              description="The kitchen faucet has been dripping for 2 days"
              status="IN_PROGRESS"
              priority="MEDIUM"
              date="Oct 5, 2024"
            />
            <MaintenanceRequestCard
              title="AC not cooling properly"
              description="Living room AC is not cooling effectively"
              status="COMPLETED"
              priority="HIGH"
              date="Oct 1, 2024"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Manager Contact</h2>
          <div className="space-y-2">
            <p className="text-gray-700">
              <span className="font-semibold">Name:</span> John Smith
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> john.smith@example.com
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Phone:</span> (555) 123-4567
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function MaintenanceRequestCard({ title, description, status, priority, date }: {
  title: string;
  description: string;
  status: string;
  priority: string;
  date: string;
}) {
  const getStatusIcon = () => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor()}`}>
          {priority}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Status: {status.replace('_', ' ')}</span>
        <span className="text-gray-500">{date}</span>
      </div>
    </div>
  );
}
