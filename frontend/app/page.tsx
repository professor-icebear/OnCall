'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Repository {
  id: number;
  owner: string;
  name: string;
  default_branch: string;
}

interface Investigation {
  id: number;
  status: string;
  error_message: string;
  created_at: string;
}

export default function Dashboard() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch repositories
      const reposResponse = await fetch('http://localhost:8000/api/repositories');
      if (reposResponse.ok) {
        const reposData = await reposResponse.json();
        setRepos(Array.isArray(reposData) ? reposData : []);
      } else {
        console.error('Failed to fetch repositories:', reposResponse.status);
        setRepos([]);
      }

      // Fetch investigations
      const invResponse = await fetch('http://localhost:8000/api/investigations');
      if (invResponse.ok) {
        const invData = await invResponse.json();
        setInvestigations(Array.isArray(invData) ? invData : []);
      } else {
        console.error('Failed to fetch investigations:', invResponse.status);
        setInvestigations([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setRepos([]);
      setInvestigations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            On-Call Agent
          </Link>
          <div className="flex gap-4">
            <Link href="/setup" className="text-gray-400 hover:text-white">Setup</Link>
            <Link href="/investigate" className="text-gray-400 hover:text-white">Investigate</Link>
            <Link href="/investigations" className="text-gray-400 hover:text-white">Investigations</Link>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Status</h2>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-500">Active</span>
              </div>
            </div>
            <p className="text-gray-400 mt-2">Monitoring {repos.length} repositories</p>
          </div>

          {/* Repositories Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Repositories</h2>
            <p className="text-4xl font-bold">{repos.length}</p>
            <p className="text-gray-400">Connected</p>
          </div>

          {/* Investigations Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Investigations</h2>
            <p className="text-4xl font-bold">{investigations.length}</p>
            <p className="text-gray-400">Total</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : repos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No repositories connected yet</p>
              <Link href="/setup" className="text-blue-500 hover:underline">
                Connect your first repository →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {repos.map((repo) => (
                <div key={repo.id} className="border-b border-gray-700 pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{repo.owner}/{repo.name}</h3>
                      <p className="text-sm text-gray-400">Branch: {repo.default_branch} • ID: <code className="bg-gray-900 px-2 py-1 rounded">{repo.id}</code></p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm">Monitoring</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
