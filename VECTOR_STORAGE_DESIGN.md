# Multi-Vector RAG Storage Design

## Overview

Our semantic search system uses a **Multi-Vector approach with dynamic weights** to provide highly relevant connection recommendations based on user goals.

## Architecture

### 1. Vector Types

Each LinkedIn connection generates **7 specialized embeddings**:

- **Skills Vector** - Technical skills, programming languages, tools
- **Experience Vector** - Job titles, roles, responsibilities  
- **Company Vector** - Company names, industries, sectors
- **Location Vector** - Geographic location, cities, countries
- **Network Vector** - Connection strength, mutual connections
- **Goal Vector** - Career aspirations, interests, specialties
- **Education Vector** - Educational background, degrees, universities

### 2. AI-Powered Smart Weighting System

Weights are calculated using **multiple intelligent analysis methods**:

#### **Method 1: AI-Powered Semantic Analysis**
- Uses Azure OpenAI to understand **semantic intent** beyond keywords
- Analyzes **context, urgency, and specificity** of queries
- Handles **ambiguous, vague, and complex** user inputs
- Provides **confidence scores** for each intent category

#### **Method 2: Pattern Recognition**
- **Semantic categories** with broader understanding
- **Intent patterns** that capture common query structures
- **Related terms** that go beyond exact keyword matches
- **Contextual indicators** for urgency and specificity

#### **Method 3: Contextual Analysis**
- **Urgency detection**: "urgent", "asap", "desperate" vs "eventually"
- **Specificity analysis**: "exactly", "specifically" vs "maybe", "kind of"
- **Complexity assessment**: Simple vs complex query structures
- **Time sensitivity**: Immediate vs long-term needs

#### **Method 4: Goal-Aware Weighting**
- **User goal integration** with intelligent multipliers
- **Context-based adjustments** for urgency and specificity
- **Dynamic weight distribution** based on AI analysis
- **Fallback systems** when AI is unavailable

#### **Example Queries and Weights**
| Query | Skills | Experience | Company | Location | Network | Goal | Education |
|-------|--------|------------|---------|----------|---------|------|-----------|
| "Find senior Python developers" | 35% | 40% | 10% | 5% | 5% | 2% | 3% |
| "Startup founders in San Francisco" | 15% | 20% | 35% | 20% | 8% | 2% | 0% |
| "Machine learning experts with PhD" | 45% | 15% | 10% | 5% | 5% | 5% | 15% |
| "Remote React developers" | 40% | 15% | 10% | 25% | 5% | 3% | 2% |
| **"I need someone who can help me scale my business"** | **25%** | **30%** | **35%** | **5%** | **5%** | **0%** | **0%** |
| **"Looking for a mentor who understands the startup world"** | **15%** | **25%** | **20%** | **5%** | **25%** | **10%** | **0%** |
| **"Want to connect with people who are passionate about AI"** | **40%** | **15%** | **10%** | **5%** | **15%** | **15%** | **0%** |

### 3. Firestore Schema

#### Connection Vectors Collection (`connection_vectors`)
```typescript
{
  connectionId: string,
  userId: string,
  originalConnection: any,
  
  // Vector embeddings
  skillsVector: VectorEmbedding,
  experienceVector: VectorEmbedding,
  companyVector: VectorEmbedding,
  locationVector: VectorEmbedding,
  networkVector: VectorEmbedding,
  goalVector: VectorEmbedding,
  educationVector: VectorEmbedding,
  
  // Search metadata
  skills: string[],
  companies: string[],
  locations: string[],
  jobTitles: string[],
  industries: string[],
  education: string[],
  
  // Metadata
  lastUpdated: Date,
  isActive: boolean
}
```

#### User Goals Collection (`user_goals`)
```typescript
{
  type: 'job_search' | 'startup_building' | 'mentorship' | 'industry_networking' | 'skill_development' | 'general',
  description: string,
  keywords: string[],
  preferences: {
    location?: string[],
    industry?: string[],
    skills?: string[],
    experience_level?: 'entry' | 'mid' | 'senior' | 'executive'
  },
  lastUpdated: Date
}
```

### 4. Search Process

1. **Query Analysis** - Parse user query for keywords and intent
2. **Dynamic Weight Calculation** - Generate real-time weights based on query content
3. **Goal Integration** - Apply user goal adjustments to weights
4. **Vector Comparison** - Compare query with each vector type (7 dimensions)
5. **Weighted Scoring** - Apply dynamic weights to similarity scores
6. **Result Ranking** - Sort by weighted relevance score
7. **Filtering** - Apply additional filters (location, skills, education, etc.)

### 5. Key Features

- **Multi-dimensional search** - 7 different aspects per connection
- **AI-powered semantic analysis** - Uses Azure OpenAI to understand intent beyond keywords
- **Smart pattern recognition** - Handles ambiguous, vague, and complex queries
- **Contextual awareness** - Considers urgency, specificity, and complexity
- **Goal-aware adjustments** - User goals modify base weights intelligently
- **Fallback systems** - Graceful degradation when AI is unavailable
- **Efficient filtering** - Pre-extracted metadata for fast filtering
- **Scalable storage** - Firestore handles large vector datasets
- **Real-time updates** - Vectors updated when connections change

### 6. Performance Optimizations

- **Batch operations** - Store multiple vectors at once
- **Indexed queries** - Firestore indexes on userId, isActive
- **Caching** - Frequently accessed vectors cached
- **Lazy loading** - Vectors generated on-demand

### 7. Security

- **User isolation** - Users can only access their own vectors
- **Authentication required** - All operations require auth
- **Data validation** - Input validation on all operations

## Implementation Status

✅ **Schema Design** - Complete
✅ **Firestore Rules** - Updated for vector collections
✅ **Storage Operations** - VectorStorage class implemented
✅ **Search Logic** - AI-powered smart weighting with semantic analysis
🔄 **Embedding Generation** - Next step
🔄 **API Integration** - Next step
🔄 **Chat Integration** - Next step

## Next Steps

1. **Embedding Generation API** - Create Azure OpenAI embeddings
2. **Search API Endpoint** - RESTful search interface
3. **Goal Classification** - Auto-detect user intent
4. **Chat Integration** - Connect to chat interface
5. **Performance Testing** - Optimize for large datasets 