'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useUserStore, PersonaType, VerbosityLevel, AutomationLevel } from '@/store/user-store'
import { motion } from 'framer-motion'
import { 
  Save,
  User,
  Settings,
  Key,
  Shield,
  Palette,
  GraduationCap,
  Briefcase,
  Users,
  Building2,
  Microscope
} from 'lucide-react'

const personaIcons: Record<PersonaType, React.ReactNode> = {
  newbie: <GraduationCap className="h-5 w-5" />,
  individual: <Briefcase className="h-5 w-5" />,
  team: <Users className="h-5 w-5" />,
  enterprise: <Building2 className="h-5 w-5" />,
  researcher: <Microscope className="h-5 w-5" />
}

const personaDescriptions: Record<PersonaType, string> = {
  newbie: "Learning to code with guided assistance and detailed explanations",
  individual: "Professional developer focused on productivity and efficiency",
  team: "Collaborative development with shared configurations and standards",
  enterprise: "Enterprise-grade security, compliance, and advanced features",
  researcher: "Data science and research with multimodal capabilities"
}

export function ConfigPanel() {
  const { persona, preferences, setPersona, setPreferences, setConfigured } = useUserStore()
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState({
    claude: '',
    gemini: '',
    vertexProject: ''
  })

  const handleSave = () => {
    // TODO: Save configuration to backend
    setConfigured(true)
    toast({
      title: "Configuration saved",
      description: "Your preferences have been updated successfully",
      variant: "success" as any
    })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Select your persona to customize the experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {Object.entries(personaDescriptions).map(([type, description]) => (
                  <motion.div
                    key={type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                        persona === type 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setPersona(type as PersonaType)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 ${persona === type ? 'text-primary' : 'text-muted-foreground'}`}>
                          {personaIcons[type as PersonaType]}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium capitalize">{type}</h3>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your interaction preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="verbosity">Output Verbosity</Label>
                <Select 
                  value={preferences.verbosity} 
                  onValueChange={(value: VerbosityLevel) => 
                    setPreferences({ verbosity: value })
                  }
                >
                  <SelectTrigger id="verbosity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal - Just the essentials</SelectItem>
                    <SelectItem value="normal">Normal - Balanced information</SelectItem>
                    <SelectItem value="detailed">Detailed - Complete explanations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="automation">Automation Level</Label>
                <Select 
                  value={preferences.automation} 
                  onValueChange={(value: AutomationLevel) => 
                    setPreferences({ automation: value })
                  }
                >
                  <SelectTrigger id="automation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual - Full control</SelectItem>
                    <SelectItem value="semi">Semi-automatic - Ask for decisions</SelectItem>
                    <SelectItem value="full">Full - Handle everything</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="guidance">Guided Assistance</Label>
                  <p className="text-sm text-muted-foreground">
                    Show helpful tips and suggestions
                  </p>
                </div>
                <Switch
                  id="guidance"
                  checked={preferences.guidance}
                  onCheckedChange={(checked) => setPreferences({ guidance: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select 
                  value={preferences.theme} 
                  onValueChange={(value: 'light' | 'dark' | 'system') => 
                    setPreferences({ theme: value })
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {persona === 'enterprise' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Enterprise Settings
                </CardTitle>
                <CardDescription>
                  Advanced security and compliance options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all actions for compliance
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Encryption</Label>
                    <p className="text-sm text-muted-foreground">
                      Encrypt sensitive data at rest
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SSO Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Use company single sign-on
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your API keys for Claude and Gemini
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="claude-key">Claude API Key</Label>
                <Input
                  id="claude-key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeys.claude}
                  onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gemini-key">Gemini API Key</Label>
                <Input
                  id="gemini-key"
                  type="password"
                  placeholder="AIza..."
                  value={apiKeys.gemini}
                  onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vertex-project">Vertex AI Project ID (Optional)</Label>
                <Input
                  id="vertex-project"
                  placeholder="my-project-id"
                  value={apiKeys.vertexProject}
                  onChange={(e) => setApiKeys({ ...apiKeys, vertexProject: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  For enterprise usage with higher limits
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="min-w-[120px]">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}