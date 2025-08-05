'use client';

import { useState } from 'react';
import { SmartWeighting } from '../../lib/smart-weighting';
import { DynamicWeights } from '../../lib/vector-schema';

interface TestResult {
  query: string;
  weights: DynamicWeights;
  analysis: any;
  timestamp: Date;
}

export default function TestSmartWeighting() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>('');

  const testQueries = [
    "Find senior Python developers in San Francisco",
    "I need someone who can help me scale my business",
    "Looking for a mentor who understands the startup world",
    "Want to connect with people who are passionate about AI",
    "Need someone with experience in the field",
    "Anyone working on interesting projects?",
    "Specifically looking for a senior React developer with 5+ years experience",
    "Maybe someone who kind of knows about machine learning?",
    "I'm desperate to find someone who can help me with this urgent project"
  ];

  const userGoals = [
    { type: 'job_search', description: 'Job Search' },
    { type: 'startup_building', description: 'Startup Building' },
    { type: 'mentorship', description: 'Mentorship' },
    { type: 'skill_development', description: 'Skill Development' },
    { type: 'industry_networking', description: 'Industry Networking' },
    { type: 'general', description: 'General' }
  ];

  const testQuery = async (query: string) => {
    setLoading(true);
    try {
      const goal = selectedGoal ? { 
        type: selectedGoal as any, 
        description: userGoals.find(g => g.type === selectedGoal)?.description || '',
        keywords: [],
        preferences: {}
      } : undefined;

      const weights = await SmartWeighting.calculateSmartWeights(query, goal);
      const analysis = await SmartWeighting.analyzeSemanticIntent(query);
      
      const result: TestResult = {
        query: query,
        weights,
        analysis,
        timestamp: new Date()
      };
      
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    const newResults: TestResult[] = [];
    
    for (const testQuery of testQueries) {
      try {
        const goal = selectedGoal ? { 
          type: selectedGoal as any, 
          description: userGoals.find(g => g.type === selectedGoal)?.description || '',
          keywords: [],
          preferences: {}
        } : undefined;

        const weights = await SmartWeighting.calculateSmartWeights(testQuery, goal);
        const analysis = await SmartWeighting.analyzeSemanticIntent(testQuery);
        
        newResults.push({
          query: testQuery,
          weights,
          analysis,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Test failed for "${testQuery}":`, error);
      }
    }
    
    setResults(newResults);
    setLoading(false);
  };

  const formatWeights = (weights: DynamicWeights) => {
    return Object.entries(weights)
      .map(([key, value]) => `${key}: ${(value * 100).toFixed(1)}%`)
      .join(', ');
  };

  const getWeightColor = (weight: number) => {
    if (weight > 0.3) return 'text-green-600 font-bold';
    if (weight > 0.15) return 'text-blue-600 font-semibold';
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">🧠 Smart Weighting System Test</h1>
      
      {/* Test Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">User Goal (Optional)</label>
            <select 
              value={selectedGoal} 
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">No Goal</option>
              {userGoals.map(goal => (
                <option key={goal.type} value={goal.type}>{goal.description}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Custom Query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a test query..."
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => testQuery(query)}
            disabled={!query.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Custom Query'}
          </button>
          
          <button
            onClick={runAllTests}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </button>
          
          <button
            onClick={() => setResults([])}
            className="px-4 py-2 bg-gray-600 text-white rounded-md"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Quick Test Buttons */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Quick Test Queries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {testQueries.map((queryText, index) => (
            <button
              key={index}
              onClick={() => testQuery(queryText)}
              disabled={loading}
              className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-left disabled:opacity-50"
            >
              {queryText}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Test Results ({results.length})</h2>
        
        {results.length === 0 && (
          <p className="text-gray-500">No test results yet. Run some tests above!</p>
        )}
        
        {results.map((result, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg">"{result.query}"</h3>
              <span className="text-sm text-gray-500">
                {result.timestamp.toLocaleTimeString()}
              </span>
            </div>
            
            {/* AI Analysis */}
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-800 mb-2">AI Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><strong>Primary Intent:</strong> {result.analysis.primaryIntent}</div>
                <div><strong>Urgency:</strong> {result.analysis.urgency}</div>
                <div><strong>Specificity:</strong> {result.analysis.specificity}</div>
                <div><strong>Context:</strong> {result.analysis.context}</div>
              </div>
            </div>
            
            {/* Weights Breakdown */}
            <div>
              <h4 className="font-medium mb-2">Smart Weights</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(result.weights).map(([aspect, weight]) => (
                  <div key={aspect} className="flex justify-between">
                    <span className="capitalize">{aspect}:</span>
                    <span className={getWeightColor(weight)}>
                      {(weight * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Smart Weighting Features</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>AI-Powered Semantic Analysis (60% weight)</li>
              <li>Pattern Recognition (30% weight)</li>
              <li>Contextual Analysis (10% weight)</li>
              <li>Goal-Aware Adjustments</li>
              <li>Fallback Systems</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Analysis Methods</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Urgency Detection</li>
              <li>Specificity Analysis</li>
              <li>Complexity Assessment</li>
              <li>Intent Pattern Matching</li>
              <li>Semantic Category Recognition</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 