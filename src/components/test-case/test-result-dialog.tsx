import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils/date';
import { formatDistance } from 'date-fns';
import { CheckCircle, XCircle, Terminal, Clock, AlertCircle, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TestCaseExecution {
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
}

interface TestResultHistory {
  id: string;
  projectId: string;
  name?: string;
  testResultFileName?: string;
  success: boolean;
  status: string;
  executionTime?: number;
  output?: string;
  errorMessage?: string;
  resultData?: string;
  createdAt: string;
  createdBy?: string;
  lastRunBy?: string;
  browser?: string;
  videoUrl?: string;
  testCaseExecutions: TestCaseExecution[];
}

interface TestResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  testResult: TestResultHistory | null;
}

export function TestResultDialog({ isOpen, onClose, testResult }: TestResultDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!testResult) return null;

  // Parse output if it's a JSON string
  let parsedOutput = null;
  if (testResult.output) {
    try {
      parsedOutput = JSON.parse(testResult.output);
    } catch (e) {
      parsedOutput = testResult.output;
    }
  }

  // Calculate overall statistics
  const totalExecutions = testResult.testCaseExecutions.length;
  const passedExecutions = testResult.testCaseExecutions.filter(exec => exec.status === 'passed').length;
  const failedExecutions = testResult.testCaseExecutions.filter(exec => exec.status === 'failed').length;
  const totalDuration = testResult.testCaseExecutions.reduce((sum, exec) => sum + (exec.duration || 0), 0);

  // Download test result function
  const handleDownloadTestResult = async () => {
    if (!testResult.testResultFileName) {
      toast.error('Test result file name not available');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/projects/${testResult.projectId}/test-results/${testResult.id}/download`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download test result');
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${testResult.testResultFileName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Test result downloaded successfully');
    } catch (error) {
      console.error('Error downloading test result:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download test result');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Execution Results</DialogTitle>
          <DialogDescription>
            Test execution completed with {totalExecutions} test case{totalExecutions !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="text-green-500 h-5 w-5" />
              ) : (
                <XCircle className="text-red-500 h-5 w-5" />
              )}
              <h3 className="text-lg font-medium">
                Test Execution {testResult.success ? 'Passed' : 'Failed'}
              </h3>
            </div>
            <div className="flex gap-2">
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.status}
              </Badge>
              {passedExecutions > 0 && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {passedExecutions} Passed
                </Badge>
              )}
              {failedExecutions > 0 && (
                <Badge variant="destructive">
                  {failedExecutions} Failed
                </Badge>
              )}
            </div>
          </div>

          {/* Execution Info */}
          <div className="text-sm text-muted-foreground">
            Browser: {testResult.browser || 'chromium'} • 
            Total Duration: {totalDuration ? (totalDuration / 1000).toFixed(2) : '0'}s • 
            {testResult.testResultFileName && (
              <>
                Filename: {testResult.testResultFileName} • 
              </>
            )}
            Created {testResult.createdAt ? formatDistance(new Date(testResult.createdAt), new Date(), { addSuffix: true }) : ''}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="executions" className="w-full">
            <TabsList>
              <TabsTrigger value="executions" className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Test Case Executions
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Raw Output
              </TabsTrigger>
            </TabsList>

            <TabsContent value="executions" className="mt-4">
              <div className="space-y-4">
                {/* Test Case Executions Table */}
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b text-sm font-medium">
                    <div className="col-span-4">Test Case</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Duration</div>
                    <div className="col-span-2 text-center">Retries</div>
                    <div className="col-span-2 text-right">Execution Time</div>
                  </div>
                  {testResult.testCaseExecutions.length > 0 ? (
                    testResult.testCaseExecutions.map((execution) => (
                      <div key={execution.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 text-sm items-center hover:bg-slate-50">
                        {/* Test Case Name & Tags */}
                        <div className="col-span-4">
                          <div className="font-medium">{execution.testCase.name}</div>
                          {execution.testCase.tags && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {execution.testCase.tags.split(',').map(tag => tag.trim()).join(', ')}
                            </div>
                          )}
                        </div>
                        
                        {/* Status */}
                        <div className="col-span-2">
                          <Badge 
                            variant={execution.status === 'passed' ? "default" : 
                                    execution.status === 'failed' ? "destructive" : 
                                    "secondary"}
                            className="capitalize"
                          >
                            {execution.status}
                          </Badge>
                        </div>
                        
                        {/* Duration */}
                        <div className="col-span-2 text-right text-muted-foreground">
                          {execution.duration ? 
                            `${(execution.duration / 1000).toFixed(2)}s` : 
                            'N/A'
                          }
                        </div>
                        
                        {/* Retries */}
                        <div className="col-span-2 text-center">
                          {execution.retries > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                              <span>{execution.retries}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </div>
                        
                        {/* Execution Time */}
                        <div className="col-span-2 text-right text-muted-foreground text-xs">
                          {execution.endTime ? 
                            formatDistance(new Date(execution.endTime), new Date(), { addSuffix: true }) : 
                            'N/A'
                          }
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No test case executions available
                    </div>
                  )}
                </div>

                {/* Media Section */}
                {(testResult.videoUrl) && (
                  <div className="space-y-4">
                    {testResult.videoUrl && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Test Recording</h4>
                        <video 
                          src={testResult.videoUrl} 
                          controls 
                          className="w-full rounded-md"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <div className="rounded-md border bg-slate-50 p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[500px]">
                  {typeof parsedOutput === 'string' ? parsedOutput : JSON.stringify(parsedOutput, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-between items-center gap-2 mt-4">
            <div>
              {testResult.testResultFileName && (
                <Button
                  variant="outline"
                  onClick={handleDownloadTestResult}
                  disabled={isDownloading}
                  className="flex items-center gap-2"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isDownloading ? 'Downloading...' : 'Download Test Results'}
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 