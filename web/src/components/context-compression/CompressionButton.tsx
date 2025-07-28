'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { CompressionModal } from './CompressionModal'
import { Archive, Loader2, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

interface CompressionButtonProps {
  taskId: string
  taskResult: {
    output: string
    executedBy: string
    mode: string
    data?: any
  }
  onCompressionComplete?: (result: any) => void
  disabled?: boolean
}

export function CompressionButton({ 
  taskId, 
  taskResult, 
  onCompressionComplete,
  disabled = false 
}: CompressionButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  const handleCompress = () => {
    setIsModalOpen(true)
  }

  const handleCompressionStart = () => {
    setIsCompressing(true)
  }

  const handleCompressionEnd = (result?: any) => {
    setIsCompressing(false)
    setIsModalOpen(false)
    
    if (result && onCompressionComplete) {
      onCompressionComplete(result)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <Button
          onClick={handleCompress}
          disabled={disabled || isCompressing}
          variant="outline"
          size="sm"
          className="group relative overflow-hidden border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 dark:border-blue-700 dark:hover:border-blue-500 dark:hover:bg-blue-950"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {isCompressing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Archive className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          )}
          
          <span className="relative z-10">
            {isCompressing ? 'Compressing...' : 'Compress Context'}
          </span>
          
          <Zap className="ml-2 h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </Button>
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-blue-500" />
              Compress Task Context
            </DialogTitle>
            <DialogDescription>
              Create a compressed representation of this task's execution context
              for efficient storage and future reference.
            </DialogDescription>
          </DialogHeader>
          
          <CompressionModal
            taskId={taskId}
            taskResult={taskResult}
            onCompressionStart={handleCompressionStart}
            onCompressionComplete={handleCompressionEnd}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}