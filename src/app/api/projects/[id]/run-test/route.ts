import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

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
  { params }: { params: { id: string } }
) {
  try {
    // With Next.js 15, params need to be awaited
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
      useReadableNames = false  // Default to false if not provided
    } = data;

    // Get current project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Execute the command in a child process
    console.log(`Executing command: ${command}`);
    console.log(`Test file path: ${testFilePath || 'tests/'}`);
    
    // Start test execution in the background
    const childProcess = exec(command, { 
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });
    
    // Create a test result history entry
    let testResult;
    if (mode === 'file' && testCaseId) {
      // Running a single test case
      testResult = await prisma.testResultHistory.create({
        data: {
          projectId: projectId,
          testCaseId: testCaseId,
          status: 'running',
          success: false,
          browser: browser,
        },
      });
    } else {
      // Running multiple tests or the whole project
      testResult = await prisma.testResultHistory.create({
        data: {
          projectId: projectId,
          status: 'running',
          success: false,
          browser: browser,
        },
      });
    }
    
    // Handle output from the child process
    let output = '';
    let errorOutput = '';
    
    childProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    childProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Update the test result when the process completes
    childProcess.on('close', async (code) => {
      console.log(`Command executed with exit code: ${code}`);
      
      const success = code === 0;
      
      // Update test result
      await prisma.testResultHistory.update({
        where: { id: testResult.id },
        data: {
          status: success ? 'completed' : 'failed',
          success: success,
          output: output.substring(0, 10000), // Limit output size
          errorMessage: errorOutput.substring(0, 10000), // Limit error output size
          executionTime: Date.now() - new Date(testResult.createdAt).getTime(), // Duration in ms
        },
      });
      
      // Also update the lastRun timestamp for the test case
      if (mode === 'file' && testCaseId) {
        await prisma.testCase.update({
          where: { id: testCaseId },
          data: {
            lastRun: new Date(),
          },
        });
      }
      
      // For list mode, update all test cases
      if (mode === 'list' && testCaseIds && testCaseIds.length > 0) {
        await prisma.$transaction(
          testCaseIds.map((id: string) => 
            prisma.testCase.update({
              where: { id },
              data: { lastRun: new Date() }
            })
          )
        );
      }
      
      console.log(`Test result updated: ${success ? 'Success' : 'Failure'}`);
    });
    
    return NextResponse.json({ 
      message: 'Test execution started', 
      testResultId: testResult.id 
    });
  } catch (error) {
    console.error('Error running test:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run test' },
      { status: 500 }
    );
  }
} 