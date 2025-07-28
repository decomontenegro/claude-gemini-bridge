'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react'

export function ValidationMode() {
  const [code, setCode] = useState('')
  const [validationResult, setValidationResult] = useState<any>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>🛡️ Code Validation Mode</CardTitle>
        <CardDescription>
          Get your code reviewed by both AIs for maximum confidence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <textarea
            placeholder="Paste your code here for validation..."
            className="w-full h-40 p-4 border rounded-lg"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          
          <Button className="w-full" variant="bridge">
            Validate with Both AIs
          </Button>

          {validationResult && (
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  Claude Analysis
                </h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p>Code structure: Excellent</p>
                  <p>Best practices: Followed</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  Gemini Analysis
                </h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p>Performance: Could be optimized</p>
                  <p>Suggestion: Use memoization</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}