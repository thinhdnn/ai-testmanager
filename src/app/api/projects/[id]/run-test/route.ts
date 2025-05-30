import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import path from 'path';

// Convert exec to a Promise-based function
const execAsync = promisify(exec);

// Helper function to slugify a name for file naming
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-|-$/g, '')       // Remove leading/trailing hyphens
    || 'test';                   // Fallback if name is empty after processing
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = id;
    
    const data = await request.json();
    const { 
      command, 
      mode, 
      testCaseId, 
      testCaseIds, 
      browser, 
      config, 
      testFilePath,
      useReadableNames = false,
      waitForResult = false,  // New parameter to control execution mode
      testRunName
    } = data;

    // Get current project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.playwrightProjectPath) {
      return NextResponse.json({ error: 'Playwright project path not configured' }, { status: 400 });
    }

    // Convert relative project path to absolute path
    const appRoot = process.cwd();
    const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);

    // Create a test result history entry first
    let testResult = await prisma.testResultHistory.create({
      data: {
        projectId: projectId,
        status: 'running',
        success: false,
        browser: browser,
        name: testRunName || null,
        ...(mode === 'file' && testCaseId ? {
          testCaseExecutions: {
            create: [{
              testCaseId: testCaseId,
              status: 'running'
            }]
          }
        } : mode === 'list' && testCaseIds && testCaseIds.length > 0 ? {
          testCaseExecutions: {
            create: testCaseIds.map((id: string) => ({
              testCaseId: id,
              status: 'running'
            }))
          }
        } : mode === 'project' ? {
          testCaseExecutions: {
            create: await (async () => {
              const testCases = await prisma.testCase.findMany({
                where: { projectId }
              });
              return testCases.map(tc => ({
                testCaseId: tc.id,
                status: 'running'
              }));
            })()
          }
        } : {})
      },
      include: {
        testCaseExecutions: {
          include: {
            testCase: true
          }
        }
      }
    });

    // Function to execute the test and return result
    const executeTest = () => new Promise<{
      success: boolean;
      output: string;
      errorOutput: string;
      executionTime: number;
    }>((resolve, reject) => {
      let output = '';
      let errorOutput = '';
      let testStarted = false;
      let testCompleted = false;
      let testPassed = false;
      let failureDetected = false;
      const startTime = Date.now();

      try {
        console.log(`Executing command in directory: ${absoluteProjectPath}`);
        console.log(`Command: ${command}`);

        const childProcess = exec(command, { 
          maxBuffer: 1024 * 1024 * 10,
          cwd: absoluteProjectPath
        });

        childProcess.stdout?.on('data', (data) => {
          const text = data.toString();
          output += text;
          console.log('Test output:', text);

          if (text.includes('Running 1 test') || text.includes('Running tests')) {
            testStarted = true;
          }
          if (text.includes('1 passed') || text.includes('tests passed')) {
            testCompleted = true;
            testPassed = true;
          }
          if (text.includes('1 failed') || text.includes('tests failed') || text.includes('Test failed')) {
            testCompleted = true;
            failureDetected = true;
          }
        });

        childProcess.stderr?.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          console.error('Test error:', text);
        });

        childProcess.on('error', (error) => {
          reject(error);
        });

        childProcess.on('exit', (code, signal) => {
          const executionTime = Date.now() - startTime;
          if (!testCompleted) {
            // Test didn't complete normally
            resolve({
              success: false,
              output,
              errorOutput: `Process ${signal ? `terminated with signal ${signal}` : `exited with code ${code}`}`,
              executionTime
            });
          } else {
            resolve({
              success: testPassed,
              output,
              errorOutput,
              executionTime
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });

    if (waitForResult) {
      try {
        // Execute test and wait for result
        const result = await executeTest();
        
        // Update test result with final status
        testResult = await prisma.testResultHistory.update({
          where: { id: testResult.id },
          data: {
            status: 'completed',
            success: result.success,
            output: result.output.substring(0, 10000),
            errorMessage: result.errorOutput || null,
            executionTime: result.executionTime,
            testCaseExecutions: {
              updateMany: {
                where: { testResultId: testResult.id },
                data: {
                  status: result.success ? 'passed' : 'failed',
                  duration: result.executionTime,
                  output: result.output,
                  errorMessage: result.errorOutput || null,
                  endTime: new Date()
                }
              }
            }
          },
          include: {
            testCaseExecutions: {
              include: {
                testCase: true
              }
            }
          }
        });

        // Update test case last run time
        if (mode === 'file' && testCaseId) {
          await prisma.testCase.update({
            where: { id: testCaseId },
            data: { lastRun: new Date() }
          });
        }

        return NextResponse.json({ 
          message: 'Test execution completed',
          testResultId: testResult.id,
          result: testResult
        });
      } catch (error) {
        // Update test result with error status
        await prisma.testResultHistory.update({
          where: { id: testResult.id },
          data: {
            status: 'failed',
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        throw error;
      }
    } else {
      // Start test in background
      executeTest()
        .then(async (result) => {
          // Update test result with final status
          await prisma.testResultHistory.update({
            where: { id: testResult.id },
            data: {
              status: 'completed',
              success: result.success,
              output: result.output.substring(0, 10000),
              errorMessage: result.errorOutput || null,
              executionTime: result.executionTime,
              testCaseExecutions: {
                updateMany: {
                  where: { testResultId: testResult.id },
                  data: {
                    status: result.success ? 'passed' : 'failed',
                    duration: result.executionTime,
                    output: result.output,
                    errorMessage: result.errorOutput || null,
                    endTime: new Date()
                  }
                }
              }
            },
            include: {
              testCaseExecutions: {
                include: {
                  testCase: true
                }
              }
            }
          });

          // Update test case last run time
          if (mode === 'file' && testCaseId) {
            await prisma.testCase.update({
              where: { id: testCaseId },
              data: { lastRun: new Date() }
            });
          }
        })
        .catch(async (error) => {
          // Update test result with error status
          await prisma.testResultHistory.update({
            where: { id: testResult.id },
            data: {
              status: 'failed',
              success: false,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        });

      return NextResponse.json({ 
        message: 'Test execution started',
        testResultId: testResult.id
      });
    }
  } catch (error) {
    console.error('Error running test:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run test' },
      { status: 500 }
    );
  }
} 