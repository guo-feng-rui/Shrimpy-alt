'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDisplayName } from '@/lib/utils';

interface Recommendation {
  id: string;
  name: string;
  company: string;
  position: string;
  relevanceScore: number;
  reason: string;
  contactInfo?: string;
}

export default function RecommendationsPage() {
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  
  const { user } = useAuth();
  const router = useRouter();

  // Mock recommendations data
  const recommendations: Recommendation[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      company: 'TechCorp',
      position: 'Senior Product Manager',
      relevanceScore: 95,
      reason: 'Sarah has extensive experience in product management and has helped several engineers transition into PM roles. She\'s also connected to multiple hiring managers in the field.',
      contactInfo: 'sarah.chen@techcorp.com'
    },
    {
      id: '2',
      name: 'Michael Rodriguez',
      company: 'InnovateLab',
      position: 'VP of Product',
      relevanceScore: 88,
      reason: 'Michael leads product strategy and has mentored many product managers. He\'s well-connected in the startup ecosystem and can provide valuable insights.',
      contactInfo: 'michael.rodriguez@innovatelab.com'
    },
    {
      id: '3',
      name: 'Jennifer Park',
      company: 'DataFlow Inc',
      position: 'Product Director',
      relevanceScore: 82,
      reason: 'Jennifer specializes in data-driven product management and has experience in both B2B and B2C products. She can provide guidance on the transition process.',
      contactInfo: 'jennifer.park@dataflow.com'
    },
    {
      id: '4',
      name: 'David Thompson',
      company: 'ScaleUp Ventures',
      position: 'Product Lead',
      relevanceScore: 78,
      reason: 'David has experience in scaling products and teams. He can provide insights into the day-to-day responsibilities of a product manager.',
      contactInfo: 'david.thompson@scaleup.com'
    },
    {
      id: '5',
      name: 'Lisa Wang',
      company: 'GrowthTech',
      position: 'Senior PM',
      relevanceScore: 75,
      reason: 'Lisa has a strong background in user research and product strategy. She can help you understand the key skills needed for product management.',
      contactInfo: 'lisa.wang@growthtech.com'
    }
  ];

  const handleContact = (recommendation: Recommendation) => {
    // Here you would implement contact functionality
    console.log('Contacting:', recommendation.name);
    alert(`Contacting ${recommendation.name} at ${recommendation.contactInfo}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Weak-Tie Activator</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                ← Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Recommendations</h2>
          <p className="text-gray-600">Based on your mission and network, here are the most valuable weak ties to reach out to</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommendations List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Recommendations</CardTitle>
                <CardDescription>
                  Ranked by relevance to your mission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((recommendation, index) => (
                    <div
                      key={recommendation.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedRecommendation === recommendation.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedRecommendation(recommendation.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <h3 className="font-semibold text-gray-900">{recommendation.name}</h3>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {recommendation.relevanceScore}% match
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {recommendation.position} at {recommendation.company}
                          </p>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {recommendation.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendation Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Details</CardTitle>
                <CardDescription>
                  {selectedRecommendation 
                    ? 'Get more information about this connection'
                    : 'Select a recommendation to see details'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedRecommendation ? (
                  (() => {
                    const recommendation = recommendations.find(r => r.id === selectedRecommendation);
                    if (!recommendation) return null;
                    
                    return (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-blue-600">
                              {recommendation.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {recommendation.name}
                          </h3>
                          <p className="text-gray-600 mb-2">
                            {recommendation.position} at {recommendation.company}
                          </p>
                          <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            {recommendation.relevanceScore}% relevance score
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">Why this connection?</h4>
                            <p className="text-gray-700 text-sm">{recommendation.reason}</p>
                          </div>

                          {recommendation.contactInfo && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1">Contact Information</h4>
                              <p className="text-gray-700 text-sm">{recommendation.contactInfo}</p>
                            </div>
                          )}

                          <div className="pt-4">
                            <Button 
                              onClick={() => handleContact(recommendation)}
                              className="w-full"
                            >
                              Reach Out
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p>Select a recommendation to see details</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
                <CardDescription>
                  How to make the most of these recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Reach out within 24 hours</p>
                      <p className="text-gray-600">The sooner you connect, the more likely they are to respond</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Be specific about your ask</p>
                      <p className="text-gray-600">Mention your mission and what you hope to learn from them</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Follow up appropriately</p>
                      <p className="text-gray-600">If they don't respond, send a gentle follow-up after a week</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 