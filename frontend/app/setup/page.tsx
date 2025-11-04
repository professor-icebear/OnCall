'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SetupPage() {
  const router = useRouter();
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('main');
  const [railwayProjectName, setRailwayProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [repoId, setRepoId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('owner', owner);
      formData.append('name', name);
      formData.append('default_branch', branch);
      if (railwayProjectName) {
        formData.append('railway_project_name', railwayProjectName);
      }
      
      const response = await fetch('http://localhost:8000/api/repositories', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      setRepoId(data.id);
      alert('Repository connected successfully!');
    } catch (error) {
      console.error('Error connecting repository:', error);
      alert('Failed to connect repository');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!repoId || files.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        await fetch(`http://localhost:8000/api/repositories/${repoId}/documents`, {
          method: 'POST',
          body: formData
        });
      }
      
      alert('Files uploaded successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
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
            <Link href="/setup" className="text-white">Setup</Link>
            <Link href="/investigate" className="text-gray-400 hover:text-white">Investigate</Link>
            <Link href="/investigations" className="text-gray-400 hover:text-white">Investigations</Link>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">Setup Your Repository</h1>
        
        {!repoId ? (
          <form onSubmit={handleConnect} className="space-y-6 bg-gray-800 rounded-lg p-6">
            <div>
              <label className="block text-sm font-medium mb-2">Repository Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g., yourusername"
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Repository Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., my-project"
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Default Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Railway Project Name (Optional)</label>
              <input
                type="text"
                value={railwayProjectName}
                onChange={(e) => setRailwayProjectName(e.target.value)}
                placeholder="my-railway-project"
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Enable automatic monitoring of Railway deployments</p>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect Repository'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
              <p className="text-green-400">✓ Repository connected successfully!</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Documentation (Optional)</h2>
              <p className="text-gray-400 mb-4">Upload README files, API docs, or other documentation to help the agent understand your project.</p>
              
              <input
                type="file"
                multiple
                accept=".pdf,.md,.txt"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="mb-4"
              />
              
              {files.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400">Selected files:</p>
                  <ul className="list-disc list-inside text-sm">
                    {files.map((f, i) => (
                      <li key={i}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={handleFileUpload}
                  disabled={uploading || files.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </button>
                
                <button
                  onClick={() => router.push('/')}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                >
                  Skip & Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
