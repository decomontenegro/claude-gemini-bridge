# Workflow History System

## Overview

The Workflow History system provides comprehensive tracking and logging for all workflow executions in the Claude-Gemini Bridge. It captures detailed information about each workflow run, including execution steps, refinements, and prompt exports.

## Features

### 1. Execution Tracking
- **Automatic Logging**: Every workflow execution is automatically tracked with a unique ID
- **Step-by-Step Recording**: Each step in a workflow is logged with:
  - Start and end times
  - Duration
  - AI used (Claude, Gemini, or both)
  - Task description
  - Status (pending, executing, completed, failed)
  - Results or error messages

### 2. Refinement Tracking
- Records when users refine individual steps or all results
- Stores refinement results separately
- Links refinements to their original execution

### 3. Prompt Export Logging
- Tracks when users export prompts for VS Code
- Records export format and timestamp
- Stores exported content for reference

### 4. Data Persistence
- Uses Zustand with persistence middleware
- Stores data in browser localStorage
- Automatically keeps last 100 executions
- Survives browser refreshes

### 5. Search and Filter
- Filter by workflow type
- Filter by execution status
- Date range filtering
- Text search across task descriptions
- All filters work in combination

### 6. Export Capabilities
- **JSON Export**: Full detailed export with all metadata
- **CSV Export**: Simplified tabular format for spreadsheets
- Export individual executions or filtered results
- Export entire history

### 7. Statistics Dashboard
- Total execution count
- Success rate percentage
- Average execution duration
- Most used workflow type
- Refinement and export counts
- Breakdown by workflow type and status

## Usage

### Accessing History

1. **From Dashboard**: 
   - Click "History" in the navigation header
   - View recent executions in the dashboard summary card

2. **History Page** (`/history`):
   - Full history view with all features
   - Detailed execution browser
   - Statistics overview

### Viewing Execution Details

1. Click on any execution to expand details
2. View all steps with their status and duration
3. See refinements and exports
4. Access detailed view panel on the right

### Filtering and Searching

1. Click "Filtros" to show filter options
2. Select workflow type, status, or date range
3. Use search box for text search
4. Clear filters to reset view

### Exporting Data

1. **Export All**: Use JSON/CSV buttons in header
2. **Export Single**: Use export button on individual executions
3. **Export Filtered**: Apply filters first, then export

## Technical Implementation

### Store Structure (`workflow-history-store.ts`)

```typescript
interface WorkflowExecution {
  id: string
  workflowType: string
  workflowTitle: string
  taskDescription: string
  startTime: Date
  endTime?: Date
  duration?: number
  status: 'executing' | 'completed' | 'failed' | 'cancelled'
  steps: WorkflowStep[]
  refinements: RefinementRecord[]
  promptExports: ExportRecord[]
  metadata: ExecutionMetadata
}
```

### Integration Points

1. **SmartWorkflows Component**:
   - Calls `startExecution` when workflow begins
   - Updates step status during execution
   - Records refinements and exports
   - Completes execution on finish/failure

2. **WorkflowHistory Component**:
   - Displays execution list with filtering
   - Shows statistics summary
   - Handles export functionality
   - Provides detailed view

3. **Dashboard Integration**:
   - Shows summary statistics
   - Lists recent executions
   - Quick link to full history

## Future Enhancements

1. **Backend Sync**: 
   - API endpoint ready for backend storage
   - Cloud backup of execution history

2. **Advanced Analytics**:
   - Performance trends over time
   - AI preference patterns
   - Task complexity analysis

3. **Team Features**:
   - Share execution history
   - Collaborative refinements
   - Team statistics

4. **Automation**:
   - Auto-retry failed executions
   - Scheduled workflow runs
   - Execution templates from history