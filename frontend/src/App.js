import React, { useState } from 'react';
import { Github, FileText, Play, Download, GitPullRequest, Sparkles, Code, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [githubToken, setGithubToken] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [testSummaries, setTestSummaries] = useState([]);
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [error, setError] = useState('');

  const connectToGithub = async () => {
    if (!githubToken) {
      setError('Please enter your GitHub token');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/repos`, {
        headers: {
          'Authorization': `token ${githubToken}`
        }
      });
      
      setRepositories(response.data);
      setActiveTab('repositories');
    } catch (err) {
      setError('Failed to connect to GitHub. Please check your token.');
      console.error('GitHub connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectRepository = async (repo) => {
    setSelectedRepo(repo);
    setLoading(true);
    setError('');
    
    try {
      const [owner, repoName] = repo.full_name.split('/');
      const response = await axios.get(`${API_BASE_URL}/repos/${owner}/${repoName}/contents`, {
        headers: {
          'Authorization': `token ${githubToken}`
        }
      });
      
      setFiles(response.data);
      setActiveTab('files');
    } catch (err) {
      setError('Failed to fetch repository files');
      console.error('Files fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (file) => {
    setSelectedFiles(prev => 
      prev.find(f => f.path === file.path)
        ? prev.filter(f => f.path !== file.path)
        : [...prev, file]
    );
  };

  const generateTestSummaries = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/generate-summaries`, {
        files: selectedFiles,
        language: selectedRepo.language || 'JavaScript'
      });
      
      setTestSummaries(response.data);
      setActiveTab('summaries');
    } catch (err) {
      setError('Failed to generate test summaries');
      console.error('Summary generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateTestCode = async (summary) => {
    setSelectedSummary(summary);
    setLoading(true);
    setError('');

    try {
      // Get file content
      const file = selectedFiles.find(f => f.name === summary.file);
      if (!file) {
        throw new Error('File not found');
      }

      const contentResponse = await axios.get(`${API_BASE_URL}/file-content`, {
        params: { url: file.download_url }
      });

      // Generate test code
      const response = await axios.post(`${API_BASE_URL}/generate-code`, {
        summary,
        fileContent: contentResponse.data.content,
        language: selectedRepo.language || 'JavaScript'
      });
      
      setGeneratedCode(response.data.code);
      setActiveTab('code');
    } catch (err) {
      setError('Failed to generate test code');
      console.error('Code generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPullRequest = async () => {
    if (!selectedSummary || !generatedCode) {
      setError('No test code to create PR');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const response = await axios.post(`${API_BASE_URL}/create-pr`, {
        owner,
        repo: repoName,
        testCode: generatedCode,
        fileName: selectedSummary.file,
        branchName: `add-tests-${Date.now()}`
      }, {
        headers: {
          'Authorization': `token ${githubToken}`
        }
      });
      
      if (response.data.success) {
        alert(`✅ Pull request created successfully!\nPR #${response.data.pr_number}\nURL: ${response.data.pr_url}`);
      }
    } catch (err) {
      setError('Failed to create pull request');
      console.error('PR creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ Code copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const TabButton = ({ id, children, active, onClick, disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 font-medium rounded-t-lg transition-all ${
        active 
          ? 'bg-blue-600 text-white border-b-2 border-blue-600' 
          : disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Workik AI Test Generator</h1>
          </div>
          <p className="text-gray-600 text-lg">Generate intelligent test cases for your GitHub repositories</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex flex-wrap">
            <TabButton 
              id="setup" 
              active={activeTab === 'setup'} 
              onClick={() => setActiveTab('setup')}
            >
              <Github className="w-4 h-4 inline mr-2" />
              Setup
            </TabButton>
            <TabButton 
              id="repositories" 
              active={activeTab === 'repositories'} 
              onClick={() => setActiveTab('repositories')}
              disabled={repositories.length === 0}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Repositories
            </TabButton>
            <TabButton 
              id="files" 
              active={activeTab === 'files'} 
              onClick={() => setActiveTab('files')}
              disabled={!selectedRepo}
            >
              <Code className="w-4 h-4 inline mr-2" />
              Files
            </TabButton>
            <TabButton 
              id="summaries" 
              active={activeTab === 'summaries'} 
              onClick={() => setActiveTab('summaries')}
              disabled={testSummaries.length === 0}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Test Plans
            </TabButton>
            <TabButton 
              id="code" 
              active={activeTab === 'code'} 
              onClick={() => setActiveTab('code')}
              disabled={!generatedCode}
            >
              <Play className="w-4 h-4 inline mr-2" />
              Generated Code
            </TabButton>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 min-h-96 relative">
          
          {/* Setup Tab */}
          {activeTab === 'setup' && (
            <div className="p-8">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-6">
                  <Github className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect to GitHub</h2>
                  <p className="text-gray-600">Enter your GitHub personal access token to get started</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GitHub Personal Access Token
                    </label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && connectToGithub()}
                    />
                  </div>
                  
                  <button
                    onClick={connectToGithub}
                    disabled={loading || !githubToken}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Github className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Connecting...' : 'Connect to GitHub'}
                  </button>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>How to get token:</strong><br/>
                    1. Go to GitHub Settings → Developer settings<br/>
                    2. Personal access tokens → Generate new token<br/>
                    3. Select 'repo' permissions<br/>
                    4. Copy the token here
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Repositories Tab */}
          {activeTab === 'repositories' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Repository</h2>
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {repositories.map(repo => (
                  <div
                    key={repo.id}
                    onClick={() => selectRepository(repo)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">{repo.name}</h3>
                        <p className="text-gray-600 text-sm">{repo.full_name}</p>
                        {repo.description && (
                          <p className="text-gray-500 text-sm mt-1">{repo.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {repo.language && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {repo.language}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Select Files for Testing</h2>
                  <p className="text-gray-600">Repository: {selectedRepo?.name}</p>
                </div>
                <span className="text-sm text-gray-600">
                  {selectedFiles.length} file(s) selected
                </span>
              </div>
              
              <div className="grid gap-3 mb-6 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    onClick={() => toggleFileSelection(file)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedFiles.find(f => f.path === file.path)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!selectedFiles.find(f => f.path === file.path)}
                        onChange={() => {}}
                        className="mr-3"
                      />
                      <FileText className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="font-medium">{file.name}</span>
                      <span className="ml-auto text-sm text-gray-500">
                        {Math.round(file.size / 1024)}KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={generateTestSummaries}
                disabled={loading || selectedFiles.length === 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Generating Test Plans...' : 'Generate Test Plans'}
              </button>
            </div>
          )}

          {/* Test Summaries Tab */}
          {activeTab === 'summaries' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Generated Test Plans</h2>
              <div className="grid gap-6 max-h-96 overflow-y-auto">
                {testSummaries.map((summary, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">{summary.title}</h3>
                        <p className="text-gray-600 mb-3">{summary.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span>Framework: {summary.framework}</span>
                          <span>Tests: {summary.testCount}</span>
                          <span>File: {summary.file}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => generateTestCode(summary)}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center transition-colors disabled:opacity-50"
                      >
                        <Code className="w-4 h-4 mr-2" />
                        Generate Code
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {summary.coverage && summary.coverage.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Code Tab */}
          {activeTab === 'code' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Generated Test Code</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => copyToClipboard(generatedCode)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Copy Code
                  </button>
                  <button
                    onClick={createPullRequest}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center transition-colors"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <GitPullRequest className="w-4 h-4 mr-2" />
                    )}
                    Create PR
                  </button>
                </div>
              </div>
              
              {selectedSummary && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800">{selectedSummary.title}</h3>
                  <p className="text-gray-600 text-sm">{selectedSummary.description}</p>
                </div>
              )}
              
              <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto max-h-96 overflow-y-auto">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                  {generatedCode || 'No code generated yet. Generate a test plan first.'}
                </pre>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-xl">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Processing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>Built for Workik AI Internship Assignment</p>
        </div>
      </div>
    </div>
  );
}

export default App;