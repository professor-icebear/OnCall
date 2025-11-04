'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Investigation {
  id: number;
  status: string;
  error_message: string;
  root_cause: string;
  suggested_fix: string;
  created_at: string;
  completed_at: string | null;
}

interface ParsedRootCause {
  root_cause?: string;
  problematic_code?: string;
  suggested_fix?: string;
  action?: string;
  confidence?: string;
}

export default function InvestigationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchInvestigation();
      // Poll for updates if investigation is still running
      const interval = setInterval(() => {
        fetchInvestigation();
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchInvestigation = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/investigations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setInvestigation(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching investigation:', error);
      setLoading(false);
    }
  };

  const parseRootCause = (rootCause: string): ParsedRootCause => {
    // Try to parse as JSON first
    try {
      return JSON.parse(rootCause);
    } catch {
      // If not JSON, return as plain text
      return { root_cause: rootCause };
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
      default:
        return '⏳';
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
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (id === 'undefined') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4 text-xl">Invalid investigation ID</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading investigation...</p>
        </div>
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4 text-xl">Investigation not found</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const parsedData = parseRootCause(investigation.root_cause || investigation.suggested_fix || '{}');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')} 
              className="text-lg font-semibold hover:text-blue-400 transition-colors flex items-center gap-2"
            >
              <span className="text-2xl">←</span>
              <span>On-Call Agent</span>
            </button>
            <div className="flex gap-4 ml-8">
              <Link href="/" className="text-gray-400 hover:text-white">Dashboard</Link>
              <Link href="/setup" className="text-gray-400 hover:text-white">Setup</Link>
              <Link href="/investigate" className="text-gray-400 hover:text-white">Investigate</Link>
              <Link href="/investigations" className="text-white">Investigations</Link>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-lg border ${getStatusColor(investigation.status)}`}>
            {getStatusIcon(investigation.status)} {investigation.status.toUpperCase()}
          </span>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Investigation #{investigation.id}
          </h1>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>🕐 Created: {new Date(investigation.created_at).toLocaleString()}</span>
            {investigation.completed_at && (
              <span>⏱️ Completed: {new Date(investigation.completed_at).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Error Message Card */}
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 mb-6 hover:border-red-500/80 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-xl font-bold text-red-300">Error Detected</h2>
          </div>
          <p className="text-red-200 font-mono text-sm bg-red-950/50 p-4 rounded-lg border border-red-800/50">
            {investigation.error_message}
          </p>
        </div>

        {/* Root Cause Card */}
        {parsedData.root_cause && (
          <div className="bg-purple-900/20 border border-purple-500/50 rounded-xl p-6 mb-6 hover:border-purple-500/80 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🔍</div>
              <h2 className="text-xl font-bold text-purple-300">Root Cause Analysis</h2>
            </div>
            <p className="text-gray-200 leading-relaxed bg-gray-900/50 p-4 rounded-lg border border-purple-800/30">
              {parsedData.root_cause}
            </p>
            
            {parsedData.confidence && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-gray-400">Confidence:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  parsedData.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                  parsedData.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {parsedData.confidence.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Problematic Code Card */}
        {parsedData.problematic_code && (
          <div className="bg-orange-900/20 border border-orange-500/50 rounded-xl p-6 mb-6 hover:border-orange-500/80 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">💻</div>
              <h2 className="text-xl font-bold text-orange-300">Problematic Code</h2>
            </div>
            <pre className="text-orange-200 bg-gray-950 p-4 rounded-lg border border-orange-800/30 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {parsedData.problematic_code}
            </pre>
          </div>
        )}

        {/* Suggested Fix Card */}
        {(parsedData.suggested_fix || investigation.suggested_fix) && (
          <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-6 mb-6 hover:border-green-500/80 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">✅</div>
              <h2 className="text-xl font-bold text-green-300">Suggested Fix</h2>
            </div>
            <div className="bg-gray-950 p-4 rounded-lg border border-green-800/30">
              {parsedData.suggested_fix ? (
                <pre className="text-green-200 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                  {parsedData.suggested_fix}
                </pre>
              ) : (
                <pre className="text-gray-300 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                  {investigation.suggested_fix}
                </pre>
              )}
            </div>
            
            {parsedData.action && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-gray-400">Recommended Action:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  parsedData.action === 'revert' ? 'bg-red-500/20 text-red-400' :
                  parsedData.action === 'patch' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {parsedData.action.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Status Messages */}
        {investigation.status === 'investigating' && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="animate-spin text-2xl">⚡</div>
              <p className="text-blue-300 font-medium">Investigation in progress... Real-time updates every 2 seconds.</p>
            </div>
          </div>
        )}

        {investigation.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-2xl">❌</div>
              <div>
                <p className="text-red-300 font-medium mb-1">Investigation Failed</p>
                <p className="text-gray-400 text-sm">Please check the backend logs for details.</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            ← Back to Dashboard
          </button>
          {investigation.status === 'completed' && (
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
