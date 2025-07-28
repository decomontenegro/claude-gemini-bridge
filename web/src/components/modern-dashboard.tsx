'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button3D } from '@/components/ui/button-3d'
import { ParticleBackground } from '@/components/ui/particle-background'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { useIsMobile } from '@/hooks/use-media-query'
import { ClaudeLogo, GeminiLogo } from '@/components/ui/brand-logos'
import { 
  Zap, 
  Brain, 
  Sparkles, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Activity,
  Users,
  Globe,
  Cpu
} from 'lucide-react'

interface Metric {
  label: string
  value: string | number
  change: string
  icon: React.ElementType
  trend: 'up' | 'down' | 'neutral'
}

export function ModernDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const isMobile = useIsMobile()
  
  const metrics: Metric[] = [
    {
      label: 'Total Executions',
      value: '1,234',
      change: '+12%',
      icon: Activity,
      trend: 'up'
    },
    {
      label: 'Success Rate',
      value: '98.5%',
      change: '+2.3%',
      icon: CheckCircle,
      trend: 'up'
    },
    {
      label: 'Avg Response Time',
      value: '2.3s',
      change: '-0.5s',
      icon: Clock,
      trend: 'up'
    },
    {
      label: 'Active Users',
      value: '456',
      change: '+23',
      icon: Users,
      trend: 'up'
    }
  ]
  
  const recentActivity = [
    { id: 1, type: 'claude', task: 'Code Analysis', status: 'completed', time: '2 min ago' },
    { id: 2, type: 'gemini', task: 'Search Query', status: 'completed', time: '5 min ago' },
    { id: 3, type: 'both', task: 'Architecture Review', status: 'in_progress', time: '10 min ago' },
    { id: 4, type: 'claude', task: 'Debug Session', status: 'completed', time: '15 min ago' },
  ]
  
  return (
    <div className="relative min-h-screen">
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Main Content */}
      <div className="relative z-10 p-6 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-display font-bold mb-2 flex items-center gap-3">
                  <ClaudeLogo size="xl" />
                  <span className="text-claude-500">Claude</span>
                  <span className="text-muted-foreground">×</span>
                  <GeminiLogo size="xl" />
                  <span className="text-gemini-500">Gemini</span>
                  <span className="ml-2">Dashboard</span>
                </h1>
                <p className="text-muted-foreground text-lg">
                  Real-time insights into your AI operations
                </p>
              </div>
              <div className="flex gap-3">
                <Button3D variant="claude" size="lg">
                  <Brain className="mr-2 h-5 w-5" />
                  New Task
                </Button3D>
                <Button3D variant="gemini" size="lg">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Workflows
                </Button3D>
              </div>
            </div>
          </GlassCard>
        </motion.div>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GlassCard
                className="p-6 cursor-pointer"
                variant={selectedMetric === metric.label ? 'claude' : 'default'}
                onClick={() => setSelectedMetric(metric.label)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {metric.label}
                    </p>
                    <p className="text-3xl font-bold">
                      {metric.value}
                    </p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className={`h-4 w-4 mr-1 ${
                        metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      }`} />
                      <span className={`text-sm ${
                        metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {metric.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    selectedMetric === metric.label 
                      ? 'bg-claude-500/20' 
                      : 'bg-white/10'
                  }`}>
                    <metric.icon className="h-6 w-6" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
        
        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Activity Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-claude-500" />
                  Activity Overview
                </h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    1D
                  </button>
                  <button className="px-3 py-1 text-sm rounded-lg bg-claude-500/20 text-claude-400">
                    1W
                  </button>
                  <button className="px-3 py-1 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    1M
                  </button>
                </div>
              </div>
              
              {/* Placeholder for chart */}
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-claude-500 to-gemini-500 animate-pulse" />
                  <p className="text-muted-foreground">Chart visualization here</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
          
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <GlassCard className="p-6 h-full">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-gemini-500" />
                Recent Activity
              </h3>
              
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'claude' ? 'bg-claude-500' :
                        activity.type === 'gemini' ? 'bg-gemini-500' :
                        'bg-gradient-to-r from-claude-500 to-gemini-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{activity.task}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activity.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {activity.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
        
        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-claude-500" />
              System Status
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-claude-500" />
                  <div>
                    <p className="font-medium">Claude API</p>
                    <p className="text-sm text-muted-foreground">Operational</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-gemini-500" />
                  <div>
                    <p className="font-medium">Gemini API</p>
                    <p className="text-sm text-muted-foreground">Operational</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Globe className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="font-medium">Bridge Server</p>
                    <p className="text-sm text-muted-foreground">99.9% Uptime</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}