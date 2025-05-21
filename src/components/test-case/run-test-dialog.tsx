import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, Copy, Settings, CheckCircle, XCircle, Loader2, Video, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { TestCaseService } from '@/lib/api/services/test-case-service';
import { ProjectService } from '@/lib/api/services/project-service';
import { TestCase as ApiTestCase, TestResult as ApiTestResult } from '@/lib/api/interfaces';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigurationSettings {
  playwright?: {
    timeout?: string;
    expectTimeout?: string;
    retries?: string;
    workers?: string;
    fullyParallel?: string;
  };
  browser?: {
    baseURL?: string;
    headless?: string;
    'viewport.width'?: string;
    'viewport.height'?: string;
    locale?: string;
    timezoneId?: string;
    video?: string;
    screenshot?: string;
    trace?: string;
  };
  testFilePath?: string;
  useReadableNames?: boolean;
}

export interface RunTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  mode: 'file' | 'list' | 'project';
  testCaseId?: string;
  testCaseIds?: string[];
}

// Define internal component interface for TestResult that includes all needed properties
interface TestResult {
  id: string;
  testCaseId: string | null;
  status: string;
  success: boolean;
  executionTime: number | null;
  createdAt: Date;
  output: string | null;
  errorMessage: string | null;
  browser: string | null;
  video?: string;
  screenshot?: string;
}

// Extended TestCase interface with testFilePath property
interface TestCase extends Partial<ApiTestCase> {
  id: string;
  name: string;
  testFilePath?: string;
}

export function RunTestDialog({ isOpen, onClose, projectId, mode, testCaseId, testCaseIds }: RunTestDialogProps) {
  const [config, setConfig] = useState<ConfigurationSettings>({});
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState('');
  const [browser, setBrowser] = useState('chromium');
  const [headless, setHeadless] = useState(true);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [testFilePath, setTestFilePath] = useState('tests/'); // Default test file path
  const [testResultId, setTestResultId] = useState<string | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [testCaseData, setTestCaseData] = useState<TestCase | null>(null);
  const [useReadableNames, setUseReadableNames] = useState(true);
  const [activeTab, setActiveTab] = useState("logs"); // Default to logs tab
  const testCaseService = new TestCaseService();
  const projectService = new ProjectService();
  
  // Log when activeTab changes
  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
  }, [activeTab]);
  
  // Manually force the active tab to be 'logs' when the result dialog opens
  useEffect(() => {
    if (isResultDialogOpen) {
      console.log('Result dialog opened, forcing logs tab');
      setActiveTab('logs');
    }
  }, [isResultDialogOpen]);
  
  // Load test case data if we have a testCaseId
  useEffect(() => {
    async function loadTestCaseData() {
      if (testCaseId && mode === 'file') {
        try {
          const data = await testCaseService.getTestCase(projectId, testCaseId);
          setTestCaseData(data as TestCase);
          // Use the testFilePath from the database if available
          if (data.testFilePath) {
            setTestFilePath(data.testFilePath);
          }
        } catch (error) {
          console.error('Error loading test case data:', error);
        }
      }
    }
    
    if (isOpen && testCaseId) {
      loadTestCaseData();
    }
  }, [isOpen, projectId, testCaseId, mode]);
  
  useEffect(() => {
    async function loadConfig() {
      try {
        // First check if we have a configuration in sessionStorage
        const sessionConfig = sessionStorage.getItem(`test_config_${projectId}`);
        
        if (sessionConfig) {
          const parsedConfig = JSON.parse(sessionConfig);
          setConfig(parsedConfig);
          
          // Set headless from config if available
          if (parsedConfig.browser?.headless) {
            setHeadless(parsedConfig.browser.headless === 'true');
          }
          
          // Set testFilePath if it exists in session config
          if (parsedConfig.testFilePath) {
            setTestFilePath(parsedConfig.testFilePath);
          }

          // Set useReadableNames if it exists in session config
          if (parsedConfig.useReadableNames !== undefined) {
            setUseReadableNames(parsedConfig.useReadableNames);
          }
        } else {
          // If not in sessionStorage, load from server
          const data = await projectService.getProjectConfiguration(projectId);
          setConfig(data);
          
          // Set headless from config if available
          if (data.browser?.headless) {
            setHeadless(data.browser.headless === 'true');
          }
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
        toast.error('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadConfig();
      generateCommand();
    }
    
    // Cleanup polling interval when dialog closes
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isOpen, projectId]);
  
  useEffect(() => {
    generateCommand();
  }, [browser, headless, config, testFilePath, testCaseData, useReadableNames]);
  
  // Effect to poll for test result updates
  useEffect(() => {
    if (testResultId && isResultDialogOpen) {
      // First, fetch immediately
      fetchTestResult(testResultId);
      
      // Then set up polling
      const interval = setInterval(() => {
        fetchTestResult(testResultId);
      }, 2000); // Poll every 2 seconds
      
      setPollingInterval(interval);
      
      // Clean up polling when the dialog closes or testResultId changes
      return () => {
        clearInterval(interval);
      };
    }
  }, [testResultId, isResultDialogOpen, projectId]);
  
  // Function to fetch test result
  async function fetchTestResult(resultId: string) {
    try {
      const apiResult = await testCaseService.getTestResult(projectId, resultId);
      
      // Debug log to see what's actually returned from the API
      console.log('API Result from test-result endpoint:', apiResult);
      
      // Convert API result to component's TestResult format
      const result: TestResult = {
        id: apiResult.id,
        testCaseId: apiResult.testCaseId || null,
        status: apiResult.status,
        success: apiResult.success,
        executionTime: apiResult.executionTime || null,
        createdAt: new Date(apiResult.createdAt),
        // Use errorMessage field directly if available, or fall back to error
        errorMessage: apiResult.errorMessage || apiResult.error || null,
        // Use properly typed fields now that they're defined in the interface
        output: apiResult.output || null,
        browser: apiResult.browser || null,
        // Map videoUrl to video for internal component use
        video: apiResult.videoUrl,
        screenshot: apiResult.screenshot
      };
      
      // Debug log to see the result object we're setting
      console.log('Processed test result being set to state:', result);
      
      // Choose appropriate tab based on available data
      if (result.output || result.errorMessage) {
        // If we have logs or error messages, show the logs tab
        console.log('Test has output logs or errors, switching to logs tab');
        setActiveTab('logs');
      } else if (result.video || result.screenshot) {
        // If we have media but no logs, show the media tab
        console.log('Test has media, switching to results tab');
        setActiveTab('results');
      }
      
      setTestResult(result);
      
      // If status is 'completed' or 'failed', stop polling
      if (result.status === 'completed' || result.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (error) {
      console.error('Error fetching test result:', error);
      // Don't show an error toast to avoid spamming the user during polling
    }
  }
  
  function generateCommand() {
    let baseCommand = 'npx playwright test';
    
    // Add the appropriate file pattern based on mode
    if (mode === 'file' && testCaseId) {
      baseCommand += ` ${testFilePath}`;
    } else if (mode === 'list' && testCaseIds?.length) {
      // For list mode, use the testFilePath as is
      baseCommand += ` ${testFilePath}`;
    } else if (mode === 'project') {
      // For project mode, use the testFilePath as is
      baseCommand += ` ${testFilePath}`;
    }
    
    // Add browser
    baseCommand += ` --project=${browser}`;
    
    // Add headless/headed mode
    if (!headless) {
      baseCommand += ' --headed';
    }
    
    // Add timeout if configured
    if (config.playwright?.timeout) {
      baseCommand += ` --timeout=${config.playwright.timeout}`;
    }
    
    // Add retries if configured
    if (config.playwright?.retries) {
      baseCommand += ` --retries=${config.playwright.retries}`;
    }
    
    // Add workers if configured
    if (config.playwright?.workers) {
      baseCommand += ` --workers=${config.playwright.workers}`;
    }
    
    setCommand(baseCommand);
  }
  
  function handleCopyCommand() {
    navigator.clipboard.writeText(command);
    toast.success('Command copied to clipboard');
  }
  
  async function handleRunTest() {
    try {
      // Show running state
      toast.loading('Running tests...');
      
      // Send the command to the backend for execution using service
      const data = await testCaseService.runTest(projectId, {
        command,
        mode,
        testCaseId: testCaseId || null,
        testCaseIds: testCaseIds || [],
        browser,
        headless,
        config,
        testFilePath,
        useReadableNames
      });
      
      setTestResultId(data.testResultId);
      
      toast.dismiss();
      toast.success('Test run initiated');
      
      // Close the run dialog and open the results dialog
      onClose();
      setIsResultDialogOpen(true);
    } catch (error) {
      toast.dismiss();
      console.error('Error running test:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to run test');
    }
  }
  
  function handleSaveConfig(newConfig: ConfigurationSettings) {
    try {
      // Store useReadableNames in the config
      newConfig = {
        ...newConfig,
        useReadableNames
      };
      
      // Store in sessionStorage instead of sending to server
      sessionStorage.setItem(`test_config_${projectId}`, JSON.stringify(newConfig));
      
      // Update local state
      setConfig(newConfig);
      
      // Show success message and close dialog
      toast.success('Temporary save');
      setIsConfigDialogOpen(false);
    } catch (error) {
      console.error('Error saving configuration to session:', error);
      toast.error('Failed to save configuration');
    }
  }
  
  if (loading) {
    return null;
  }
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Run Tests</DialogTitle>
            <DialogDescription>
              {mode === 'file' && 'Configure and run this test case.'}
              {mode === 'list' && 'Configure and run selected test cases.'}
              {mode === 'project' && 'Configure and run all tests in this project.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="browser" className="text-right">
                Browser
              </Label>
              <Select 
                value={browser}
                onValueChange={(value) => setBrowser(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select browser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromium">Chromium</SelectItem>
                  <SelectItem value="firefox">Firefox</SelectItem>
                  <SelectItem value="webkit">WebKit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right">
                <Label htmlFor="headless">Mode</Label>
              </div>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox 
                  id="headless" 
                  checked={headless}
                  onCheckedChange={(checked) => setHeadless(checked as boolean)}
                />
                <Label htmlFor="headless">Run in headless mode</Label>
              </div>
            </div>
            
            {mode === 'file' && testCaseData && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right">
                  <Label htmlFor="filename">Filename</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox 
                    id="useReadableNames" 
                    checked={useReadableNames}
                    onCheckedChange={(checked) => setUseReadableNames(checked as boolean)}
                  />
                  <Label htmlFor="useReadableNames">Use human-readable filenames</Label>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="command" className="text-right">
                Command
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="command"
                  value={command}
                  readOnly
                  className="pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfigDialogOpen(true)}
                    className="mr-1"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCommand}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleRunTest}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Test Configuration</DialogTitle>
            <DialogDescription>
              Configure Playwright settings for this session
            </DialogDescription>
          </DialogHeader>
          
          <ConfigurationDialog 
            config={config} 
            onSave={handleSaveConfig} 
            onCancel={() => setIsConfigDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Test Result Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Results</DialogTitle>
            <DialogDescription>
              {testResult ? `Test ${testResult.status}` : 'Running test...'}
            </DialogDescription>
          </DialogHeader>
          
          {!testResult || testResult.status === 'running' ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg">Running tests...</p>
              <p className="text-sm text-muted-foreground mt-2">This might take a moment</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 justify-between">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="text-green-500 h-6 w-6" />
                  ) : (
                    <XCircle className="text-red-500 h-6 w-6" />
                  )}
                  <div>
                    <h3 className="text-lg font-medium">
                      Test {testResult.success ? 'Passed' : 'Failed'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {testResult.browser && `Browser: ${testResult.browser}`} • 
                      {testResult.executionTime && ` Duration: ${(testResult.executionTime / 1000).toFixed(2)}s`} •
                      Created {formatDistance(new Date(testResult.createdAt), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.status}
                </Badge>
              </div>
              
              <div>
                {/* Custom tabs using our own state management */}
                <div className="border-b mb-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('results')}
                      className={`px-4 py-2 font-medium flex items-center gap-2 ${
                        activeTab === 'results' 
                          ? 'border-b-2 border-primary text-primary' 
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Video className="h-4 w-4" />
                      <span>Results & Media</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('logs')}
                      className={`px-4 py-2 font-medium flex items-center gap-2 ${
                        activeTab === 'logs' 
                          ? 'border-b-2 border-primary text-primary' 
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Terminal className="h-4 w-4" />
                      <span>Logs</span>
                    </button>
                  </div>
                </div>
                
                {/* Results tab content */}
                {activeTab === 'results' && (
                  <div className="mt-4">
                    {/* Show video if available */}
                    {testResult.video && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Video Recording</h4>
                        <div className="bg-black rounded-md overflow-hidden">
                          <video 
                            controls 
                            className="w-full"
                            src={testResult.video}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </div>
                    )}
                    
                    {/* Show screenshot if available */}
                    {testResult.screenshot && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Screenshot</h4>
                        <div className="border rounded-md overflow-hidden">
                          <img 
                            src={testResult.screenshot} 
                            alt="Test Screenshot" 
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Add a message if no media is available */}
                    {!testResult.video && !testResult.screenshot && (
                      <div className="py-8 text-center text-muted-foreground">
                        <p>No media files available for this test.</p>
                        <p className="text-sm mt-1">Configure video recording and screenshots in test settings.</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Logs tab content */}
                {activeTab === 'logs' && (
                  <div className="mt-4">
                    {/* Show error message in logs tab */}
                    {testResult.errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                        <h4 className="text-red-800 font-medium mb-2">Error</h4>
                        <pre className="text-red-700 text-sm whitespace-pre-wrap overflow-auto max-h-40">
                          {testResult.errorMessage}
                        </pre>
                      </div>
                    )}
                  
                    {testResult.output ? (
                      <div>
                        <h4 className="font-medium mb-2">Test Output</h4>
                        <div className="bg-slate-50 border rounded-md p-4">
                          <pre className="text-sm text-slate-700 whitespace-pre-wrap overflow-auto max-h-[400px]">
                            {testResult.output}
                          </pre>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Log length: {testResult.output?.length} characters
                        </div>
                      </div>
                    ) : !testResult.errorMessage && (
                      <div className="py-8 text-center text-muted-foreground">
                        <p>No log output available for this test.</p>
                        <p className="text-sm mt-2">
                          Debug info:
                          {testResult.output === null ? ' output is null' : 
                           testResult.output === undefined ? ' output is undefined' : 
                           testResult.output === '' ? ' output is empty string' : 
                           ` output exists but not showing (${typeof testResult.output})`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          
          <DialogFooter>
            {testResult && testResult.output && (
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('logs')}
                className="mr-auto"
              >
                <Terminal className="mr-2 h-4 w-4" />
                View Logs
              </Button>
            )}
            <Button onClick={() => setIsResultDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ConfigurationDialogProps {
  config: ConfigurationSettings;
  onSave: (config: ConfigurationSettings) => void;
  onCancel: () => void;
}

function ConfigurationDialog({ config, onSave, onCancel }: ConfigurationDialogProps) {
  const [editedConfig, setEditedConfig] = useState<ConfigurationSettings>({
    playwright: { ...config.playwright },
    browser: { ...config.browser },
    testFilePath: config.testFilePath || 'tests/',
    useReadableNames: config.useReadableNames || true
  });
  
  useEffect(() => {
    setEditedConfig({
      playwright: { ...config.playwright },
      browser: { ...config.browser },
      testFilePath: config.testFilePath || 'tests/',
      useReadableNames: config.useReadableNames || true
    });
  }, [config]);
  
  const handlePlaywrightChange = (key: string, value: string) => {
    setEditedConfig(prev => ({
      ...prev,
      playwright: {
        ...prev.playwright,
        [key]: value
      }
    }));
  };
  
  const handleBrowserChange = (key: string, value: string) => {
    setEditedConfig(prev => ({
      ...prev,
      browser: {
        ...prev.browser,
        [key]: value
      }
    }));
  };

  const handleTestPathChange = (value: string) => {
    setEditedConfig(prev => ({
      ...prev,
      testFilePath: value
    }));
  };
  
  return (
    <div className="py-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Test Path</h3>
          <div className="space-y-2 mt-2">
            <Label htmlFor="testFilePath">Test File Path</Label>
            <Input
              id="testFilePath"
              value={editedConfig.testFilePath || 'tests/'}
              onChange={(e) => handleTestPathChange(e.target.value)}
              placeholder="tests/"
            />
            <p className="text-sm text-muted-foreground">
              Specify a directory (tests/) or exact file path (tests/user-login.spec.ts)
            </p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium">Playwright Settings</h3>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                value={editedConfig.playwright?.timeout || ''}
                onChange={(e) => handlePlaywrightChange('timeout', e.target.value)}
                placeholder="30000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectTimeout">Expect Timeout (ms)</Label>
              <Input
                id="expectTimeout"
                value={editedConfig.playwright?.expectTimeout || ''}
                onChange={(e) => handlePlaywrightChange('expectTimeout', e.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retries">Retries</Label>
              <Input
                id="retries"
                value={editedConfig.playwright?.retries || ''}
                onChange={(e) => handlePlaywrightChange('retries', e.target.value)}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workers">Workers</Label>
              <Input
                id="workers"
                value={editedConfig.playwright?.workers || ''}
                onChange={(e) => handlePlaywrightChange('workers', e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fullyParallel"
                  checked={editedConfig.playwright?.fullyParallel === 'true'}
                  onCheckedChange={(checked) => handlePlaywrightChange('fullyParallel', checked ? 'true' : 'false')}
                />
                <Label htmlFor="fullyParallel">Run tests in parallel</Label>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium">Browser Settings</h3>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="video">Video</Label>
              <Select 
                value={editedConfig.browser?.video || 'off'}
                onValueChange={(value) => handleBrowserChange('video', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Video recording" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="retain-on-failure">Retain on failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="screenshot">Screenshot</Label>
              <Select 
                value={editedConfig.browser?.screenshot || 'off'}
                onValueChange={(value) => handleBrowserChange('screenshot', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Screenshots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="only-on-failure">Only on failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trace">Trace</Label>
              <Select 
                value={editedConfig.browser?.trace || 'off'}
                onValueChange={(value) => handleBrowserChange('trace', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Trace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="retain-on-failure">Retain on failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      
      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(editedConfig)}>Temporary Save</Button>
      </DialogFooter>
    </div>
  );
} 