'use client';

import { useState } from 'react';
import { SmartWeighting } from '../../lib/smart-weighting';
import { DynamicWeights } from '../../lib/vector-schema';

interface TestResult {
  query: string;
  weights: DynamicWeights;
  analysis: {
    primaryIntent: string;
    urgency: string;
    specificity: string;
    context: string;
  };
  patterns: Record<string, number>;
  context: {
    urgency: string;
    specificity: string;
    complexity: string;
  };
  timestamp: Date;
  goal?: {
    type: string;
    description: string;
    keywords: string[];
    preferences: Record<string, unknown>;
  };
}

interface ComparisonResult {
  query: string;
  oldWeights: DynamicWeights;
  smartWeights: DynamicWeights;
  analysis: {
    primaryIntent: string;
    urgency: string;
    specificity: string;
    context: string;
  };
  differences: Record<string, number>;
  improvements: string[];
  timestamp: Date;
}

export default function TestSmartWeighting() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [testMode, setTestMode] = useState<'smart' | 'comparison'>('smart');

  const testQueries = [
    // Queries that demonstrate smart weighting advantages
    "I need someone who can help me scale my business",
    "Looking for a mentor who understands the startup world", 
    "Want to connect with people who are passionate about AI",
    "Need someone with experience in the field",
    "Anyone working on interesting projects?",
    "Someone who can help me figure this out",
    "Looking for guidance on my career path",
    "Want to learn from people who've been there",
    "I'm desperate to find someone who can help me with this urgent project",
    "Maybe someone who kind of knows about machine learning?",
    // Specific technical queries
    "Senior Python developers with machine learning experience",
    "React developers in San Francisco",
    "Startup founders with technical background",
    "Enterprise architects with cloud experience",
    "PhD graduates working in AI research"
  ];

  const userGoals = [
    { type: 'job_search', description: 'Job Search' },
    { type: 'startup_building', description: 'Startup Building' },
    { type: 'mentorship', description: 'Mentorship' },
    { type: 'skill_development', description: 'Skill Development' },
    { type: 'industry_networking', description: 'Industry Networking' },
    { type: 'general', description: 'General' }
  ];

  const testSmartWeighting = async (query: string) => {
    setLoading(true);
    try {
      const goal = selectedGoal ? { 
        type: selectedGoal as 'job_search' | 'startup_building' | 'mentorship' | 'skill_development' | 'industry_networking' | 'general', 
        description: userGoals.find(g => g.type === selectedGoal)?.description || '',
        keywords: [],
        preferences: {}
      } : undefined;

      const weights = await SmartWeighting.calculateSmartWeights(query, goal);
      const analysis = await SmartWeighting.analyzeSemanticIntent(query);
      const patterns = SmartWeighting.detectPatterns(query);
      const context = SmartWeighting.analyzeContext(query);
      
      const result: TestResult = {
        query: query,
        weights,
        analysis,
        patterns,
        context,
        timestamp: new Date(),
        goal
      };
      
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const testComparison = async (query: string) => {
    setLoading(true);
    try {
      const goal = selectedGoal ? { 
        type: selectedGoal as 'job_search' | 'startup_building' | 'mentorship' | 'skill_development' | 'industry_networking' | 'general', 
        description: userGoals.find(g => g.type === selectedGoal)?.description || '',
        keywords: [],
        preferences: {}
      } : undefined;

      // Old keyword-based weights (simulated)
      const oldWeights: DynamicWeights = {
        skills: 0.20,
        experience: 0.20,
        company: 0.20,
        location: 0.15,
        network: 0.15,
        goal: 0.05,
        education: 0.05
      };

      // New smart weights
      const smartWeights = await SmartWeighting.calculateSmartWeights(query, goal);
      const analysis = await SmartWeighting.analyzeSemanticIntent(query);
      
      // Calculate differences
      const differences: Record<string, number> = {};
      const improvements: string[] = [];
      
      Object.keys(smartWeights).forEach(aspect => {
        const aspectKey = aspect as keyof DynamicWeights;
        const diff = smartWeights[aspectKey] - oldWeights[aspectKey];
        differences[aspect] = diff;
        
        if (Math.abs(diff) > 0.05) {
          const change = diff > 0 ? 'increased' : 'decreased';
          const pct = Math.abs(diff * 100).toFixed(1);
          improvements.push(`${aspect} ${change} by ${pct}%`);
        }
      });
      
      const comparison: ComparisonResult = {
        query,
        oldWeights,
        smartWeights,
        analysis,
        differences,
        improvements,
        timestamp: new Date()
      };
      
      setComparisons(prev => [comparison, ...prev]);
    } catch (error) {
      console.error('Comparison failed:', error);
      alert('Comparison failed: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    const newResults: TestResult[] = [];
    const newComparisons: ComparisonResult[] = [];
    
    for (const testQuery of testQueries) {
      try {
        const goal = selectedGoal ? { 
          type: selectedGoal as 'job_search' | 'startup_building' | 'mentorship' | 'skill_development' | 'industry_networking' | 'general', 
          description: userGoals.find(g => g.type === selectedGoal)?.description || '',
          keywords: [],
          preferences: {}
        } : undefined;

        if (testMode === 'smart') {
          const weights = await SmartWeighting.calculateSmartWeights(testQuery, goal);
          const analysis = await SmartWeighting.analyzeSemanticIntent(testQuery);
          const patterns = SmartWeighting.detectPatterns(testQuery);
          const context = SmartWeighting.analyzeContext(testQuery);
          
          newResults.push({
            query: testQuery,
            weights,
            analysis,
            patterns,
            context,
            timestamp: new Date(),
            goal
          });
        } else {
          // Comparison mode
          const oldWeights: DynamicWeights = {
            skills: 0.20, experience: 0.20, company: 0.20,
            location: 0.15, network: 0.15, goal: 0.05, education: 0.05
          };
          
          const smartWeights = await SmartWeighting.calculateSmartWeights(testQuery, goal);
          const analysis = await SmartWeighting.analyzeSemanticIntent(testQuery);
          
          const differences: Record<string, number> = {};
          const improvements: string[] = [];
          
          Object.keys(smartWeights).forEach(aspect => {
            const aspectKey = aspect as keyof DynamicWeights;
            const diff = smartWeights[aspectKey] - oldWeights[aspectKey];
            differences[aspect] = diff;
            
            if (Math.abs(diff) > 0.05) {
              const change = diff > 0 ? 'increased' : 'decreased';
              const pct = Math.abs(diff * 100).toFixed(1);
              improvements.push(`${aspect} ${change} by ${pct}%`);
            }
          });
          
          newComparisons.push({
            query: testQuery,
            oldWeights,
            smartWeights,
            analysis,
            differences,
            improvements,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error(`Test failed for "${testQuery}":`, error);
      }
    }
    
    if (testMode === 'smart') {
      setResults(newResults);
    } else {
      setComparisons(newComparisons);
    }
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

  const getDifferenceColor = (diff: number) => {
    if (diff > 0.1) return 'text-green-600 font-bold';
    if (diff > 0.05) return 'text-blue-600 font-semibold';
    if (diff < -0.1) return 'text-red-600 font-bold';
    if (diff < -0.05) return 'text-orange-600 font-semibold';
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">🧠 Smart Weighting System Test</h1>
      
      {/* Test Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Mode</label>
            <select 
              value={testMode} 
              onChange={(e) => setTestMode(e.target.value as 'smart' | 'comparison')}
              className="w-full p-2 border rounded-md"
            >
              <option value="smart">Smart Weighting Only</option>
              <option value="comparison">Compare with Old System</option>
            </select>
          </div>
          
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
            onClick={() => testMode === 'smart' ? testSmartWeighting(query) : testComparison(query)}
            disabled={!query.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? 'Testing...' : `Test ${testMode === 'smart' ? 'Smart' : 'Comparison'}`}
          </button>
          
          <button
            onClick={runAllTests}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </button>
          
          <button
            onClick={() => {
              setResults([]);
              setComparisons([]);
            }}
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
              onClick={() => testMode === 'smart' ? testSmartWeighting(queryText) : testComparison(queryText)}
              disabled={loading}
              className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-left disabled:opacity-50"
            >
              {queryText}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {testMode === 'smart' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Smart Weighting Results ({results.length})</h2>
          
          {results.length === 0 && (
            <p className="text-gray-500">No test results yet. Run some tests above!</p>
          )}
          
          {results.map((result, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">&ldquo;{result.query}&rdquo;</h3>
                <span className="text-sm text-gray-500">
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
              
              {/* AI Analysis */}
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">🤖 AI Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>Primary Intent:</strong> {result.analysis.primaryIntent}</div>
                  <div><strong>Urgency:</strong> {result.analysis.urgency}</div>
                  <div><strong>Specificity:</strong> {result.analysis.specificity}</div>
                  <div><strong>Context:</strong> {result.analysis.context}</div>
                </div>
              </div>
              
              {/* Pattern Recognition */}
              <div className="mb-4 p-3 bg-green-50 rounded-md">
                <h4 className="font-medium text-green-800 mb-2">🔍 Pattern Recognition</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(result.patterns).map(([aspect, score]) => (
                    <div key={aspect} className="flex justify-between">
                      <span className="capitalize">{aspect}:</span>
                      <span className={getWeightColor(score as number)}>
                        {((score as number) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Context Analysis */}
              <div className="mb-4 p-3 bg-purple-50 rounded-md">
                <h4 className="font-medium text-purple-800 mb-2">📊 Context Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div><strong>Urgency:</strong> {result.context.urgency}</div>
                  <div><strong>Specificity:</strong> {result.context.specificity}</div>
                  <div><strong>Complexity:</strong> {result.context.complexity}</div>
                </div>
              </div>
              
              {/* Final Weights */}
              <div>
                <h4 className="font-medium mb-2">🎯 Final Smart Weights</h4>
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
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Comparison Results ({comparisons.length})</h2>
          
          {comparisons.length === 0 && (
            <p className="text-gray-500">No comparison results yet. Run some tests above!</p>
          )}
          
          {comparisons.map((comparison, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">&ldquo;{comparison.query}&rdquo;</h3>
                <span className="text-sm text-gray-500">
                  {comparison.timestamp.toLocaleTimeString()}
                </span>
              </div>
              
              {/* AI Analysis */}
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">🤖 AI Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>Primary Intent:</strong> {comparison.analysis.primaryIntent}</div>
                  <div><strong>Urgency:</strong> {comparison.analysis.urgency}</div>
                  <div><strong>Specificity:</strong> {comparison.analysis.specificity}</div>
                  <div><strong>Context:</strong> {comparison.analysis.context}</div>
                </div>
              </div>
              
              {/* Weight Comparison */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">⚖️ Weight Comparison</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-600 mb-2">Old Keyword System</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(comparison.oldWeights).map(([aspect, weight]) => (
                        <div key={aspect} className="flex justify-between">
                          <span className="capitalize">{aspect}:</span>
                          <span className="text-gray-600">{(weight * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-green-600 mb-2">New Smart System</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(comparison.smartWeights).map(([aspect, weight]) => (
                        <div key={aspect} className="flex justify-between">
                          <span className="capitalize">{aspect}:</span>
                          <span className={getWeightColor(weight)}>{(weight * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Differences */}
              <div className="mb-4 p-3 bg-yellow-50 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-2">📈 Improvements</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(comparison.differences).map(([aspect, diff]) => (
                    <div key={aspect} className="flex justify-between">
                      <span className="capitalize">{aspect}:</span>
                      <span className={getDifferenceColor(diff)}>
                        {(diff > 0 ? '+' : '') + (diff * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                {comparison.improvements.length > 0 && (
                  <div className="mt-2">
                    <strong>Key Changes:</strong>
                    <ul className="list-disc list-inside mt-1 text-sm">
                      {comparison.improvements.map((improvement, idx) => (
                        <li key={idx}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">🧠 Smart Weighting Features</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>AI-Powered Semantic Analysis (60% weight)</li>
              <li>Pattern Recognition (30% weight)</li>
              <li>Contextual Analysis (10% weight)</li>
              <li>Goal-Aware Adjustments</li>
              <li>Fallback Systems</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">🔍 Analysis Methods</h3>
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