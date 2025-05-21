import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ProjectConfigFormProps, ConfigurationSettings } from '@/types/project';
import { ProjectService } from '@/lib/api/services';

export function ProjectConfigForm({ projectId }: ProjectConfigFormProps) {
  const [config, setConfig] = useState<ConfigurationSettings>({
    playwright: {
      timeout: '30000',
      expectTimeout: '5000',
      retries: '2',
      workers: '50%',
      fullyParallel: 'true',
    },
    browser: {
      baseURL: '',
      headless: 'true',
      'viewport.width': '1280',
      'viewport.height': '720',
      locale: 'en-US',
      timezoneId: 'UTC',
      video: 'retain-on-failure',
      screenshot: 'only-on-failure',
      trace: 'retain-on-failure',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const projectService = new ProjectService();

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await projectService.getProjectConfiguration(projectId);
        setConfig(data);
      } catch (error) {
        console.error('Error loading configuration:', error);
        toast.error('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await projectService.updateProjectConfiguration(projectId, config);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(category: keyof ConfigurationSettings, key: string, value: string) {
    setConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Playwright Configuration</CardTitle>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                value={config.playwright?.timeout}
                onChange={(e) => handleChange('playwright', 'timeout', e.target.value)}
                placeholder="30000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectTimeout">Expect Timeout (ms)</Label>
              <Input
                id="expectTimeout"
                value={config.playwright?.expectTimeout}
                onChange={(e) => handleChange('playwright', 'expectTimeout', e.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retries">Retries</Label>
              <Input
                id="retries"
                value={config.playwright?.retries}
                onChange={(e) => handleChange('playwright', 'retries', e.target.value)}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workers">Workers</Label>
              <Input
                id="workers"
                value={config.playwright?.workers}
                onChange={(e) => handleChange('playwright', 'workers', e.target.value)}
                placeholder="50%"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="fullyParallel"
                checked={config.playwright?.fullyParallel === 'true'}
                onCheckedChange={(checked: boolean) => 
                  handleChange('playwright', 'fullyParallel', checked.toString())
                }
              />
              <Label htmlFor="fullyParallel">Fully Parallel</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Browser Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseURL">Base URL</Label>
              <Input
                id="baseURL"
                value={config.browser?.baseURL}
                onChange={(e) => handleChange('browser', 'baseURL', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="headless"
                checked={config.browser?.headless === 'true'}
                onCheckedChange={(checked: boolean) => 
                  handleChange('browser', 'headless', checked.toString())
                }
              />
              <Label htmlFor="headless">Headless Mode</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewport.width">Viewport Width</Label>
              <Input
                id="viewport.width"
                value={config.browser?.['viewport.width']}
                onChange={(e) => handleChange('browser', 'viewport.width', e.target.value)}
                placeholder="1280"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewport.height">Viewport Height</Label>
              <Input
                id="viewport.height"
                value={config.browser?.['viewport.height']}
                onChange={(e) => handleChange('browser', 'viewport.height', e.target.value)}
                placeholder="720"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Input
                id="locale"
                value={config.browser?.locale}
                onChange={(e) => handleChange('browser', 'locale', e.target.value)}
                placeholder="en-US"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezoneId">Timezone</Label>
              <Input
                id="timezoneId"
                value={config.browser?.timezoneId}
                onChange={(e) => handleChange('browser', 'timezoneId', e.target.value)}
                placeholder="UTC"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
} 