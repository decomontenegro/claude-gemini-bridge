'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  History,
  ArrowRight
} from 'lucide-react'
import { useWorkflowHistoryStore } from '@/store/workflow-history-store'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'

// Mock data - replace with real data from API
const performanceData = [
  { date: 'Mon', claude: 85, gemini: 78, hybrid: 92 },
  { date: 'Tue', claude: 88, gemini: 82, hybrid: 94 },
  { date: 'Wed', claude: 82, gemini: 85, hybrid: 90 },
  { date: 'Thu', claude: 90, gemini: 88, hybrid: 95 },
  { date: 'Fri', claude: 86, gemini: 90, hybrid: 93 },
  { date: 'Sat', claude: 84, gemini: 86, hybrid: 91 },
  { date: 'Sun', claude: 87, gemini: 84, hybrid: 92 },
]

const taskDistribution = [
  { type: 'Code', value: 45, color: '#D97706' },
  { type: 'Search', value: 20, color: '#4285F4' },
  { type: 'Multimodal', value: 15, color: '#8B5CF6' },
  { type: 'Analysis', value: 15, color: '#10B981' },
  { type: 'Validation', value: 5, color: '#EF4444' },
]

const executionTimes = [
  { task: 'Code Generation', claude: 2.5, gemini: 3.2 },
  { task: 'Web Search', claude: 4.1, gemini: 2.8 },
  { task: 'Image Analysis', claude: 5.2, gemini: 3.5 },
  { task: 'Code Review', claude: 3.8, gemini: 4.5 },
]

const stats = [
  {
    title: 'Total Tasks',
    value: '1,234',
    change: '+12%',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-purple-600',
  },
  {
    title: 'Success Rate',
    value: '94.5%',
    change: '+2.3%',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
  },
  {
    title: 'Avg. Time',
    value: '3.2s',
    change: '-15%',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-600',
  },
  {
    title: 'Active Sessions',
    value: '42',
    change: '+8',
    icon: <BarChart3 className="h-4 w-4" />,
    color: 'text-orange-600',
  },
]

export function Dashboard() {
  const { getStatistics, getFilteredExecutions } = useWorkflowHistoryStore()
  const historyStats = getStatistics()
  const recentExecutions = getFilteredExecutions().slice(0, 5)
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={stat.color}>
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> from last week
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>
            Success rate comparison across different execution modes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="claude" 
                stroke="#D97706" 
                strokeWidth={2}
                dot={{ fill: '#D97706' }}
              />
              <Line 
                type="monotone" 
                dataKey="gemini" 
                stroke="#4285F4" 
                strokeWidth={2}
                dot={{ fill: '#4285F4' }}
              />
              <Line 
                type="monotone" 
                dataKey="hybrid" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={{ fill: '#8B5CF6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Workflow History Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workflow History</CardTitle>
              <CardDescription>
                Recent workflow executions and statistics
              </CardDescription>
            </div>
            <Link href="/history">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="text-2xl font-bold">{historyStats.totalExecutions}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{historyStats.successRate.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Refinements</p>
              <p className="text-2xl font-bold">{historyStats.totalRefinements}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Exports</p>
              <p className="text-2xl font-bold">{historyStats.totalExports}</p>
            </div>
          </div>
          
          {recentExecutions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium mb-2">Recent Executions</p>
              {recentExecutions.map(exec => (
                <div key={exec.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      exec.status === 'completed' ? 'bg-green-500' :
                      exec.status === 'failed' ? 'bg-red-500' :
                      exec.status === 'executing' ? 'bg-blue-500 animate-pulse' :
                      'bg-yellow-500'
                    }`} />
                    <span className="text-sm font-medium">{exec.workflowTitle}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(exec.startTime).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No workflow executions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>
              Breakdown of tasks by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Execution Times */}
        <Card>
          <CardHeader>
            <CardTitle>Average Execution Times</CardTitle>
            <CardDescription>
              Task completion times by CLI (in seconds)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={executionTimes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="task" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="claude" fill="#D97706" />
                <Bar dataKey="gemini" fill="#4285F4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Insights</CardTitle>
          <CardDescription>
            AI-powered recommendations based on usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <Brain className="h-5 w-5 text-claude mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Claude excels at code generation</p>
                <p className="text-sm text-muted-foreground">
                  Based on your usage, Claude shows 15% better performance for complex code generation tasks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <Sparkles className="h-5 w-5 text-gemini mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Gemini is faster for multimodal tasks</p>
                <p className="text-sm text-muted-foreground">
                  Image and PDF processing tasks complete 40% faster with Gemini
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Hybrid mode recommended for critical tasks</p>
                <p className="text-sm text-muted-foreground">
                  Using both CLIs increases success rate by 8% for complex analysis tasks
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}