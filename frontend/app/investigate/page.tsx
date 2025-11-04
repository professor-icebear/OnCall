'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Repository {
  id: number;
  owner: string;
  name: string;
}

export default function InvestigatePage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoId, setRepoId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deploymentLogs, setDeploymentLogs] = useState('');
  const [commitSha, setCommitSha] = useState('');
  const [loading, setLoading] = useState(false);
  const [investigationId, setInvestigationId] = useState<number | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    // Fetch repositories on mount
    fetch('http://localhost:8000/api/repositories')
      .then(res => res.json())
      .then(data => setRepos(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching repos:', err));
  }, []);

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('error_message', errorMessage);
      formData.append('deployment_logs', deploymentLogs);
      formData.append('commit_sha', commitSha);
      
      const response = await fetch(`http://localhost:8000/api/repositories/${repoId}/investigate`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Investigation started:', data);
      
      if (data.investigation_id) {
        setInvestigationId(data.investigation_id);
        // Redirect to investigation detail page
        router.push(`/investigation/${data.investigation_id}`);
      } else {
        throw new Error('No investigation ID returned');
      }
      
    } catch (error) {
      console.error('Error starting investigation:', error);
      alert(`Failed to start investigation: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            <Link href="/" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link href="/setup" className="text-gray-400 hover:text-white">Setup</Link>
            <Link href="/investigate" className="text-white">Investigate</Link>
            <Link href="/investigations" className="text-gray-400 hover:text-white">Investigations</Link>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Investigate Issue</h1>
        
        {!investigationId ? (
          <form onSubmit={handleInvestigate} className="space-y-6 bg-gray-800 rounded-lg p-6">
            <div>
              <label className="block text-sm font-medium mb-2">Repository</label>
              {repos.length > 0 ? (
                <select
                  value={repoId}
                  onChange={(e) => setRepoId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select a repository...</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.owner}/{repo.name} (ID: {repo.id})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={repoId}
                    onChange={(e) => setRepoId(e.target.value)}
                    placeholder="Enter repository ID"
                    className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-400">Or connect a repository on the Setup page first</p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Error Message</label>
              <textarea
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="e.g., Deployment failed: Cannot read property 'create' of undefined"
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Deployment Logs (Optional)</label>
              <textarea
                value={deploymentLogs}
                onChange={(e) => setDeploymentLogs(e.target.value)}
                placeholder="Paste deployment logs here..."
                rows={6}
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Commit SHA (Optional)</label>
              <input
                type="text"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                placeholder="e.g., 7a3f8e2..."
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Starting Investigation...' : 'Start Investigation'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
              <p className="text-blue-400">Investigation ID: {investigationId}</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Investigation Steps</h2>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
                    <p className="text-gray-300">{step}</p>
                  </div>
                ))}
                {steps.length === 0 && (
                  <p className="text-gray-500">Waiting for investigation to start...</p>
                )}
              </div>
            </div>
            
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
