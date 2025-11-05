'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, DollarSign, Calendar, Clock, AlertCircle, Check } from 'lucide-react';

export default function TenantBillingPage() {
  const params = useParams();
  const router = useRouter();
  const [showAddBill, setShowAddBill] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);

  // Demo data
  const tenant = {
    id: params.id,
    name: 'John Smith',
    property: '123 Oak St, Austin, TX',
    monthlyRent: 1800,
  };

  const [bills, setBills] = useState([
    {
      id: '1',
      name: 'Monthly Rent',
      billType: 'RENT',
      amount: 1800,
      dueDate: '2025-12-01',
      status: 'PAID',
      paidDate: '2025-11-28',
      paidAmount: 1800,
      isRecurring: true,
      frequency: 'MONTHLY',
    },
    {
      id: '2',
      name: 'Water & Sewer',
      billType: 'WATER',
      amount: 85,
      dueDate: '2025-12-05',
      status: 'PENDING',
      isRecurring: true,
      frequency: 'MONTHLY',
    },
    {
      id: '3',
      name: 'Electricity',
      billType: 'ELECTRICITY',
      amount: 120,
      dueDate: '2025-12-10',
      status: 'PENDING',
      isRecurring: true,
      frequency: 'MONTHLY',
    },
    {
      id: '4',
      name: 'Internet',
      billType: 'INTERNET',
      amount: 70,
      dueDate: '2025-12-15',
      status: 'PENDING',
      isRecurring: true,
      frequency: 'MONTHLY',
    },
    {
      id: '5',
      name: 'HOA Fee',
      billType: 'HOA',
      amount: 150,
      dueDate: '2025-12-01',
      status: 'OVERDUE',
      isRecurring: true,
      frequency: 'MONTHLY',
      lateFeeAmount: 25,
    },
    {
      id: '6',
      name: 'Lawn Care - November',
      billType: 'LAWN_CARE',
      amount: 100,
      dueDate: '2025-11-30',
      status: 'OVERDUE',
      isRecurring: false,
    },
  ]);

  const [payments] = useState([
    {
      id: '1',
      amount: 1800,
      paymentDate: '2025-11-28',
      paymentMethod: 'BANK_TRANSFER',
      billName: 'Monthly Rent',
      confirmationNumber: 'TXN-123456',
    },
    {
      id: '2',
      amount: 1800,
      paymentDate: '2025-10-28',
      paymentMethod: 'CHECK',
      billName: 'Monthly Rent',
      confirmationNumber: 'CHK-7890',
    },
  ]);

  const getStatusBadge = (status: string) => {
    const styles = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800',
      PARTIAL: 'bg-orange-100 text-orange-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const totalPending = bills
    .filter(b => b.status === 'PENDING')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalOverdue = bills
    .filter(b => b.status === 'OVERDUE')
    .reduce((sum, b) => sum + b.amount + (b.lateFeeAmount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Tenants</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.name} - Billing</h1>
              <p className="text-sm text-gray-600 mt-1">{tenant.property}</p>
            </div>
            <button
              onClick={() => setShowAddBill(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="h-5 w-5" />
              <span>Add Bill</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Monthly Rent</h3>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">${tenant.monthlyRent.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Pending Bills</h3>
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">${totalPending.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {bills.filter(b => b.status === 'PENDING').length} bills
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Overdue</h3>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">${totalOverdue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {bills.filter(b => b.status === 'OVERDUE').length} bills
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Paid This Month</h3>
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${bills
                .filter(b => b.status === 'PAID')
                .reduce((sum, b) => sum + (b.paidAmount || 0), 0)
                .toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bills List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Bills */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Current Bills</h2>
              </div>

              <div className="divide-y divide-gray-200">
                {bills.map((bill) => (
                  <div key={bill.id} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">{bill.name}</h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(bill.status)}`}>
                            {bill.status}
                          </span>
                          {bill.isRecurring && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Recurring • {bill.frequency}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-semibold">${bill.amount.toLocaleString()}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
                          </span>
                        </div>

                        {bill.status === 'PAID' && bill.paidDate && (
                          <div className="mt-1 text-sm text-green-600">
                            Paid on {new Date(bill.paidDate).toLocaleDateString()} - ${bill.paidAmount?.toLocaleString()}
                          </div>
                        )}

                        {bill.lateFeeAmount && (
                          <div className="mt-1 text-sm text-red-600 font-semibold">
                            + ${bill.lateFeeAmount} late fee
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {bill.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowRecordPayment(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment History Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border-l-4 border-green-500 pl-4">
                    <div className="font-semibold text-gray-900">${payment.amount.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">{payment.billName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {payment.paymentMethod.replace('_', ' ')} • {payment.confirmationNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="font-semibold text-indigo-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-100 rounded-lg text-sm transition">
                  Send Payment Reminder
                </button>
                <button className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-100 rounded-lg text-sm transition">
                  Generate Invoice
                </button>
                <button className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-100 rounded-lg text-sm transition">
                  View Lease Agreement
                </button>
                <button className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-100 rounded-lg text-sm transition">
                  Payment History Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Bill Modal */}
      {showAddBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add New Bill</h2>
            </div>

            <div className="px-6 py-4">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bill Type *
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select type...</option>
                    <option value="RENT">Monthly Rent</option>
                    <option value="WATER">Water & Sewer</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="GAS">Gas</option>
                    <option value="INTERNET">Internet</option>
                    <option value="CABLE">Cable/TV</option>
                    <option value="TRASH">Trash Pickup</option>
                    <option value="HOA">HOA Fees</option>
                    <option value="LAWN_CARE">Lawn Care</option>
                    <option value="PEST_CONTROL">Pest Control/Extermination</option>
                    <option value="PARKING">Parking</option>
                    <option value="PET_RENT">Pet Rent</option>
                    <option value="STORAGE">Storage</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bill Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Monthly Rent, Water Bill, HOA Fee"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="100.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                      This is a recurring bill
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="">Select frequency...</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Bi-weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="SEMI_ANNUALLY">Semi-Annually</option>
                        <option value="ANNUALLY">Annually</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Day of Month
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="lateFee"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="lateFee" className="text-sm font-medium text-gray-700">
                      Enable late fees
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Late Fee Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="50.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add any additional notes about this bill..."
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddBill(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Save bill
                  setShowAddBill(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Add Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedBill.name}</p>
            </div>

            <div className="px-6 py-4">
              <form className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bill Amount:</span>
                    <span className="text-lg font-bold text-gray-900">${selectedBill.amount.toLocaleString()}</span>
                  </div>
                  {selectedBill.lateFeeAmount && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-600">Late Fee:</span>
                      <span className="text-lg font-bold text-red-600">+${selectedBill.lateFeeAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 mt-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Total Due:</span>
                      <span className="text-xl font-bold text-gray-900">
                        ${(selectedBill.amount + (selectedBill.lateFeeAmount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      defaultValue={selectedBill.amount + (selectedBill.lateFeeAmount || 0)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select method...</option>
                    <option value="CASH">Cash</option>
                    <option value="CHECK">Check</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="VENMO">Venmo</option>
                    <option value="ZELLE">Zelle</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="CASHAPP">Cash App</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmation Number (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="TXN-123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add any notes about this payment..."
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRecordPayment(false);
                  setSelectedBill(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Save payment
                  setShowRecordPayment(false);
                  setSelectedBill(null);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
