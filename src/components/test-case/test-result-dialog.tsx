import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils/date';
import { formatDistance } from 'date-fns';
import { TestResult } from '@/types';
import { CheckCircle, XCircle, Terminal } from 'lucide-react';

interface TestResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  testResult: TestResult | null;
}

export function TestResultDialog({ isOpen, onClose, testResult }: TestResultDialogProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Results</DialogTitle>
          <DialogDescription>
            Test completed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Test Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="text-green-500 h-5 w-5" />
              ) : (
                <XCircle className="text-red-500 h-5 w-5" />
              )}
              <h3 className="text-lg font-medium">
                Test {testResult.success ? 'Passed' : 'Failed'}
              </h3>
            </div>
            <Badge variant={testResult.success ? "default" : "destructive"}>
              {testResult.status}
            </Badge>
          </div>

          {/* Test Info */}
          <div className="text-sm text-muted-foreground">
            Browser: {testResult.browser || 'chromium'} • 
            Duration: {testResult.executionTime ? (testResult.executionTime / 1000).toFixed(2) : '0'}s • 
            Created {testResult.createdAt ? formatDistance(new Date(testResult.createdAt), new Date(), { addSuffix: true }) : ''}
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
              <div className="space-y-4">
                {/* Test Results Table */}
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b text-sm font-medium">
                    <div className="col-span-6">Test Case</div>
                    <div className="col-span-3 text-right">Duration</div>
                    <div className="col-span-3">Status</div>
                  </div>
                  {parsedOutput?.suites ? (
                    parsedOutput.suites.map((suite: any, suiteIndex: number) => (
                      <React.Fragment key={suiteIndex}>
                        {suite.specs.map((spec: any, specIndex: number) => (
                          <div key={`${suiteIndex}-${specIndex}`} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 text-sm items-center hover:bg-slate-50">
                            <div className="col-span-6 font-medium">
                              {spec.title}
                            </div>
                            <div className="col-span-3 text-right text-muted-foreground">
                              {spec.tests?.[0]?.results?.[0]?.duration ? 
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
                      No detailed test results available
                    </div>
                  )}
                </div>

                {/* Media Section */}
                {(testResult.videoUrl || testResult.screenshot) && (
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
                    {testResult.screenshot && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Screenshot</h4>
                        <img 
                          src={testResult.screenshot} 
                          alt="Test Screenshot" 
                          className="w-full rounded-md border"
                        />
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

          {/* Error Message */}
          {testResult.errorMessage && (
            <div className="rounded-md bg-red-50 p-4 text-red-900">
              <h4 className="font-medium mb-2">Error</h4>
              <pre className="text-sm whitespace-pre-wrap">{testResult.errorMessage}</pre>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 