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
import { TestResultHistory } from '@/types';
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
interface LocalTestResult {
  id: string;
  status: string;
  success: boolean;
  executionTime: number | null;
  createdAt: Date;
  output: string | null;
  errorMessage: string | null;
  browser: string | null;
  videoUrl?: string | null;
  screenshot?: string | null;
  testCaseExecutions?: Array<{
    id: string;
    testResultId: string;
    testCaseId: string;
    status: string;
    duration?: number;
    errorMessage?: string;
    output?: string;
    startTime?: string;
    endTime?: string;
    retries: number;
    createdAt: string;
    testCase: {
      id: string;
      name: string;
      tags?: string;
    };
  }>;
  rawReport?: {
    config: {
      configFile: string;
      rootDir: string;
      forbidOnly: boolean;
      fullyParallel: boolean;
      globalSetup: null;
      globalTeardown: null;
      globalTimeout: number;
      grep: Record<string, unknown>;
      grepInvert: null;
      maxFailures: number;
      metadata: {
        actualWorkers: number;
      };
      preserveOutput: string;
      reporter: Array<[string]>;
      reportSlowTests: {
        max: number;
        threshold: number;
      };
      quiet: boolean;
      projects: Array<{
        outputDir: string;
        repeatEach: number;
        retries: number;
        metadata: {
          actualWorkers: number;
        };
        id: string;
        name: string;
        testDir: string;
        testIgnore: string[];
        testMatch: string[];
        timeout: number;
      }>;
      shard: null;
      updateSnapshots: string;
      version: string;
      workers: number;
      webServer: null;
    };
    suites: Array<{
      title: string;
      file: string;
      specs: Array<{
        title: string;
        ok: boolean;
        tags: string[];
        tests: Array<{
          projectName: string;
          results: Array<{
            status: string;
            duration: number;
            errors?: Array<{
              message: string;
              location?: {
                file: string;
                line: number;
                column: number;
              };
            }>;
          }>;
        }>;
      }>;
    }>;
    stats: {
      startTime: string;
      duration: number;
      expected: number;
      skipped: number;
      unexpected: number;
      flaky: number;
    };
  };
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
  const [testResult, setTestResult] = useState<LocalTestResult | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [testCaseData, setTestCaseData] = useState<TestCase | null>(null);
  const [testCasesData, setTestCasesData] = useState<TestCase[]>([]);
  const [useReadableNames, setUseReadableNames] = useState(true);
  const [runMode, setRunMode] = useState<'background' | 'wait'>('background');
  const [activeTab, setActiveTab] = useState("logs"); // Default to logs tab
  const [isRunning, setIsRunning] = useState(false); // New state for running status
  const [testRunName, setTestRunName] = useState(''); // New state for test run name
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
  
  // Load test cases data if we have testCaseIds
  useEffect(() => {
    async function loadTestCasesData() {
      if (mode === 'list' && testCaseIds && testCaseIds.length > 0) {
        try {
          const cases = await Promise.all(
            testCaseIds.map(id => testCaseService.getTestCase(projectId, id))
          );
          setTestCasesData(cases as TestCase[]);
        } catch (error) {
          console.error('Error loading test cases data:', error);
          toast.error('Failed to load test cases data');
        }
      }
    }
    
    if (isOpen) {
      loadTestCasesData();
    }
  }, [isOpen, projectId, testCaseIds, mode]);
  
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
    // Only poll for background mode until test completion
    if (testResultId && isResultDialogOpen && !isRunning && runMode === 'background') {
      console.log('Starting polling for background test result:', testResultId);

      // First, fetch immediately
      fetchTestResult(testResultId);
      
      // Then set up polling every 2 seconds until completion
      const interval = setInterval(async () => {
        try {
          const apiResult = await testCaseService.getTestResult(projectId, testResultId);
          console.log('Poll result:', {
            status: apiResult.status,
            hasOutput: !!apiResult.output
          });
          
          // Convert API result to component's TestResult format
          const result: LocalTestResult = {
            id: apiResult.id,
            status: apiResult.status,
            success: apiResult.success,
            executionTime: apiResult.executionTime || null,
            createdAt: new Date(apiResult.createdAt),
            errorMessage: apiResult.errorMessage || apiResult.error || null,
            output: apiResult.output || null,
            browser: apiResult.browser || null,
            videoUrl: apiResult.videoUrl,
            screenshot: apiResult.screenshot,
          };
          
          setTestResult(result);
          
          // Stop polling immediately when test is completed or failed
          if (apiResult.status === 'completed' || apiResult.status === 'failed') {
            console.log(`Test ${apiResult.status}, stopping polling`);
            clearInterval(interval);
            setPollingInterval(null);
          }
          
        } catch (error) {
          console.error('Error fetching test result:', error);
          // Stop polling on error to avoid spam
          clearInterval(interval);
          setPollingInterval(null);
        }
      }, 2000);
      
      setPollingInterval(interval);
      
      return () => {
        console.log('Cleaning up polling interval');
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [testResultId, isResultDialogOpen, isRunning, runMode]);
  
  // Function to fetch test result
  async function fetchTestResult(resultId: string) {
    try {
      const apiResult = await testCaseService.getTestResult(projectId, resultId);
      
      // Debug log to see what's actually returned from the API
      console.log('API Result from test-result endpoint:', apiResult);
      
      // Convert API result to component's TestResult format
      const result: LocalTestResult = {
        id: apiResult.id,
        status: apiResult.status,
        success: apiResult.success,
        executionTime: apiResult.executionTime || null,
        createdAt: new Date(apiResult.createdAt),
        errorMessage: apiResult.errorMessage || apiResult.error || null,
        output: apiResult.output || null,
        browser: apiResult.browser || null,
        videoUrl: apiResult.videoUrl,
        screenshot: apiResult.screenshot,
      };
      
      // Debug log to see the result object we're setting
      console.log('Processed test result being set to state:', result);
      
      // Choose appropriate tab based on available data
      if (result.output || result.errorMessage) {
        // If we have logs or error messages, show the logs tab
        console.log('Test has output logs or errors, switching to logs tab');
        setActiveTab('logs');
      } else if (result.videoUrl || result.screenshot) {
        // If we have media but no logs, show the results tab
        console.log('Test has media, switching to results tab');
        setActiveTab('results');
      }
      
      setTestResult(result);
      
    } catch (error) {
      console.error('Error fetching test result:', error);
      // Don't show an error toast to avoid spamming the user during polling
    }
  }
  
  function generateCommand() {
    let envVars = '';

    // Add environment variables if configured
    if (config.browser?.baseURL) {
      envVars += `BASE_URL=${config.browser.baseURL} `;
    }
    if (config.browser?.video) {
      envVars += `VIDEO_MODE=${config.browser.video} `;
    }
    if (config.browser?.screenshot) {
      envVars += `SCREENSHOT_MODE=${config.browser.screenshot} `;
    }

    let baseCommand = 'npx playwright test';
    
    // Add the appropriate file pattern based on mode
    if (mode === 'file' && testCaseId) {
      // For single test case, use its testFilePath
      const filePath = testCaseData?.testFilePath || testFilePath;
      baseCommand += ` ${filePath}`;
    } else if (mode === 'list' && testCasesData.length > 0) {
      // For list mode, use testFilePath from each test case
      const testFiles = testCasesData
        .map(testCase => testCase.testFilePath || `${testFilePath}${testCase.id}.ts`)
        .join(' ');
      baseCommand += ` ${testFiles}`;
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

    // Use JSON reporter for structured output
    baseCommand += ' --reporter=json';
    
    // Combine env vars with command
    const finalCommand = envVars + baseCommand;
    
    setCommand(finalCommand);
  }
  
  function handleCopyCommand() {
    navigator.clipboard.writeText(command);
    toast.success('Command copied to clipboard');
  }
  
  async function handleRunTest() {
    try {
      if (runMode === 'wait') {
        // For wait mode, close dialog immediately and show running state
        setIsRunning(true);
        onClose();
        setIsResultDialogOpen(true);
        toast.loading('Running tests...');
      } else {
        toast.loading('Running tests...');
      }
      
      const data = await testCaseService.runTest(projectId, {
        command,
        mode,
        testCaseId: testCaseId || null,
        testCaseIds: testCaseIds || [],
        browser,
        headless,
        config,
        testFilePath,
        useReadableNames,
        waitForResult: runMode === 'wait',
        testRunName: testRunName.trim() || undefined
      });

      if (runMode === 'wait') {
        const result = data.result;
        let parsedReport = null;
        
        // Try to parse JSON from output if available
        if (result?.output) {
          try {
            parsedReport = JSON.parse(result.output);
          } catch (e) {
            console.error('Failed to parse test output as JSON:', e);
          }
        }

        setTestResult(result ? {
          ...result,
          createdAt: new Date(result.createdAt),
          output: result.output || null,
          errorMessage: result.errorMessage || null,
          videoUrl: result.videoUrl || null,
          screenshot: result.screenshot || null,
          browser: result.browser || null,
          rawReport: parsedReport
        } : null);
        
        setIsRunning(false);
        toast.dismiss();
        toast.success('Test completed');
        // Don't call onClose() here since dialog is already closed
        // setIsResultDialogOpen(true) is already called above
      } else {
        setTestResultId(data.testResultId);
        toast.dismiss();
        toast.success('Test run initiated');
        onClose();
        setIsResultDialogOpen(true);
      }
    } catch (error) {
      setIsRunning(false);
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

            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right">
                <Label htmlFor="runMode">Run Mode</Label>
              </div>
              <div className="col-span-3">
                <Select
                  value={runMode}
                  onValueChange={(value: 'background' | 'wait') => setRunMode(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select run mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="background">
                      Run in Background
                    </SelectItem>
                    <SelectItem value="wait">
                      Wait for Result
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="testRunName" className="text-right">
                Run Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="testRunName"
                  value={testRunName}
                  onChange={(e) => setTestRunName(e.target.value)}
                  placeholder="Optional name for this test run"
                />
              </div>
            </div>
            
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
              {runMode === 'background' ? 'Run in Background' : 'Run and Wait'}
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
            <DialogTitle>
              {isRunning ? 'Running Tests...' : 'Test Results'}
            </DialogTitle>
            <DialogDescription>
              {isRunning ? 'Please wait while tests are running' : 'Test completed'}
            </DialogDescription>
          </DialogHeader>

          {isRunning ? (
            // Running state
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <div className="text-center">
                  <h3 className="text-lg font-medium">Running Tests</h3>
                  <p className="text-muted-foreground">
                    Please wait while your tests are executing...
                  </p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Browser: {browser} • Mode: {headless ? 'Headless' : 'Headed'}
                </p>
              </div>
            </div>
          ) : (
            // Results state (existing content)
            <div className="space-y-4">
              {/* Test Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {testResult?.success ? (
                    <CheckCircle className="text-green-500 h-5 w-5" />
                  ) : (
                    <XCircle className="text-red-500 h-5 w-5" />
                  )}
                  <h3 className="text-lg font-medium">
                    Test {testResult?.success ? 'Passed' : 'Failed'}
                  </h3>
                </div>
                <Badge variant="default" className="bg-red-500">
                  completed
                </Badge>
              </div>

              {/* Test Info */}
              <div className="text-sm text-muted-foreground">
                Browser: {testResult?.browser || 'chromium'} • 
                Duration: {testResult?.executionTime ? (testResult.executionTime / 1000).toFixed(2) : '0'}s • 
                Created {testResult?.createdAt ? formatDistance(new Date(testResult.createdAt), new Date(), { addSuffix: true }) : ''}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="results" className="w-full">
                <TabsList>
                  <TabsTrigger value="results" className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Results & Media
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Logs
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="results" className="mt-4">
                  <div className="rounded-md border">
                    <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b text-sm font-medium">
                      <div className="col-span-6">Test Case</div>
                      <div className="col-span-3 text-right">Duration</div>
                      <div className="col-span-3">Status</div>
                    </div>
                    {testResult?.testCaseExecutions && testResult.testCaseExecutions.length > 0 ? (
                      testResult.testCaseExecutions.map((testCaseExecution, index) => {
                        return (
                          <div key={index} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 text-sm items-center hover:bg-slate-50">
                            <div className="col-span-6 font-medium">
                              {testCaseExecution.testCase.name}
                            </div>
                            <div className="col-span-3 text-right text-muted-foreground">
                              {testCaseExecution.duration ? 
                                `${(testCaseExecution.duration / 1000).toFixed(2)}s` : 
                                'N/A'
                              }
                            </div>
                            <div className="col-span-3">
                              <Badge 
                                variant={testCaseExecution.status === 'passed' ? "default" : "destructive"}
                                className="capitalize"
                              >
                                {testCaseExecution.status.charAt(0).toUpperCase() + testCaseExecution.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    ) : testResult?.rawReport ? (
                      testResult.rawReport.suites.map((suite, suiteIndex) => (
                        <React.Fragment key={suiteIndex}>
                          {suite.specs.map((spec, specIndex) => (
                            <div key={`${suiteIndex}-${specIndex}`} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 text-sm items-center hover:bg-slate-50">
                              <div className="col-span-6 font-medium">
                                {spec.title}
                              </div>
                              <div className="col-span-3 text-right text-muted-foreground">
                                {spec.tests[0]?.results[0]?.duration ? 
                                  `${(spec.tests[0].results[0].duration / 1000).toFixed(2)}s` : 
                                  'N/A'
                                }
                              </div>
                              <div className="col-span-3">
                                <Badge 
                                  variant={spec.ok ? "default" : "destructive"}
                                  className="capitalize"
                                >
                                  {spec.ok ? "Passed" : "Failed"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </React.Fragment>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        No test results available
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="mt-4">
                  <div className="rounded-md border bg-slate-50 p-4">
                    <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[500px]">
                      {testResult?.output || 'No logs available'}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Footer */}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setActiveTab('logs')} variant="default">
                  View Logs
                </Button>
              </div>
            </div>
          )}
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
  // Convert initial milliseconds to seconds for display
  const [editedConfig, setEditedConfig] = useState<ConfigurationSettings>({
    playwright: {
      ...config.playwright,
      timeout: config.playwright?.timeout ? String(Number(config.playwright.timeout) / 1000) : '',
      expectTimeout: config.playwright?.expectTimeout ? String(Number(config.playwright.expectTimeout) / 1000) : ''
    },
    browser: { ...config.browser },
    useReadableNames: config.useReadableNames || true
  });
  
  useEffect(() => {
    setEditedConfig({
      playwright: {
        ...config.playwright,
        timeout: config.playwright?.timeout ? String(Number(config.playwright.timeout) / 1000) : '',
        expectTimeout: config.playwright?.expectTimeout ? String(Number(config.playwright.expectTimeout) / 1000) : ''
      },
      browser: { ...config.browser },
      useReadableNames: config.useReadableNames || true
    });
  }, [config]);
  
  const handlePlaywrightChange = (key: string, value: string) => {
    // For timeout fields, validate that the input is a valid number
    if ((key === 'timeout' || key === 'expectTimeout') && value !== '') {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) return;
    }

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

  const handleSave = () => {
    // Convert seconds back to milliseconds before saving
    const convertedConfig = {
      ...editedConfig,
      playwright: {
        ...editedConfig.playwright,
        timeout: editedConfig.playwright?.timeout 
          ? String(Number(editedConfig.playwright.timeout) * 1000) 
          : undefined,
        expectTimeout: editedConfig.playwright?.expectTimeout 
          ? String(Number(editedConfig.playwright.expectTimeout) * 1000) 
          : undefined
      }
    };
    onSave(convertedConfig);
  };
  
  return (
    <div className="py-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Playwright Settings</h3>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (seconds)</Label>
              <Input
                id="timeout"
                value={editedConfig.playwright?.timeout || ''}
                onChange={(e) => handlePlaywrightChange('timeout', e.target.value)}
                placeholder="30"
                type="number"
                min="0"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectTimeout">Expect Timeout (seconds)</Label>
              <Input
                id="expectTimeout"
                value={editedConfig.playwright?.expectTimeout || ''}
                onChange={(e) => handlePlaywrightChange('expectTimeout', e.target.value)}
                placeholder="5"
                type="number"
                min="0"
                step="1"
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
          <div className="grid grid-cols-2 gap-4 mt-4">
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
          </div>
        </div>
      </div>
      
      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Temporary Save</Button>
      </DialogFooter>
    </div>
  );
} 