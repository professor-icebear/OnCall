'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Investigation {
  id: number;
  status: string;
  error_message: string;
  created_at: string;
  repository_id?: number;
  alert_message?: string;
  completed_at?: string;
}

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvestigations();
  }, []);

  const fetchInvestigations = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/investigations');
      if (response.ok) {
        const data = await response.json();
        setInvestigations(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch investigations');
      }
    } catch (err) {
      console.error('Error fetching investigations:', err);
      setError('Error fetching investigations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'investigating':
        return '🔍';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'investigating':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="border-b border-gray-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              On-Call Agent
            </Link>
            <div className="flex gap-4">
              <Link href="/" className="text-gray-400 hover:text-white">Dashboard</Link>
              <Link href="/setup" className="text-gray-400 hover:text-white">Setup</Link>
              <Link href="/investigate" className="text-gray-400 hover:text-white">Investigate</Link>
              <Link href="/investigations" className="text-white">Investigations</Link>
            </div>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-400">Loading investigations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="border-b border-gray-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              On-Call Agent
            </Link>
            <div className="flex gap-4">
              <Link href="/" className="text-gray-400 hover:text-white">Dashboard</Link>
              <Link href="/setup" className="text-gray-400 hover:text-white">Setup</Link>
              <Link href="/investigate" className="text-gray-400 hover:text-white">Investigate</Link>
              <Link href="/investigations" className="text-white">Investigations</Link>
            </div>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchInvestigations}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            On-Call Agent
          </Link>
          <div className="flex gap-4">
            <Link href="/" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link href="/setup" className="text-gray-400 hover:text-white">Setup</Link>
            <Link href="/investigate" className="text-gray-400 hover:text-white">Investigate</Link>
            <Link href="/investigations" className="text-white">Investigations</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Investigations</h1>
          <Link 
            href="/investigate"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Start New Investigation
          </Link>
        </div>

        {investigations.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold mb-2">No Investigations Yet</h2>
            <p className="text-gray-400 mb-6">Start your first investigation to see it appear here.</p>
            <Link 
              href="/investigate"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Start Investigation
            </Link>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Error Message</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Created</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {investigations.map((investigation) => (
                    <tr key={investigation.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-gray-300">
                        #{investigation.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(investigation.status)}`}>
                          <span className="mr-2">{getStatusIcon(investigation.status)}</span>
                          {investigation.status.charAt(0).toUpperCase() + investigation.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 max-w-md">
                        <div className="truncate" title={investigation.error_message || investigation.alert_message || 'No message'}>
                          {truncateText(investigation.error_message || investigation.alert_message || 'No message', 80)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(investigation.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/investigation/${investigation.id}`}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {investigations.length > 0 && (
          <div className="mt-6 text-center text-gray-400 text-sm">
            Showing {investigations.length} investigation{investigations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

