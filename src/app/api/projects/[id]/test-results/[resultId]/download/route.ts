import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import path from 'path';
import { promises as fs } from 'fs';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const { id: projectId, resultId } = await params;
    
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

    // Get test result
    const testResult = await prisma.testResultHistory.findUnique({
      where: { id: resultId },
    });

    if (!testResult) {
      return NextResponse.json({ error: 'Test result not found' }, { status: 404 });
    }

    if (!testResult.testResultFileName) {
      return NextResponse.json({ error: 'Test result file name not found' }, { status: 400 });
    }

    // Convert relative project path to absolute path
    const appRoot = process.cwd();
    const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
    
    // Construct the test results directory path - testResultFileName already includes the full folder name
    const targetDir = path.join(absoluteProjectPath, testResult.testResultFileName);

    console.log('targetDir', targetDir);

    // Check if the directory exists
    try {
      await fs.access(targetDir);
    } catch (error) {
      return NextResponse.json({ error: 'Test result directory not found' }, { status: 404 });
    }

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // compression level
    });

    // Create a readable stream from the archive
    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk: any) => {
          controller.enqueue(chunk);
        });
        
        archive.on('end', () => {
          controller.close();
        });
        
        archive.on('error', (err: any) => {
          controller.error(err);
        });

        // Add files to the archive
        archive.directory(targetDir, false);
        
        // Finalize the archive
        archive.finalize();
      }
    });

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="${testResult.testResultFileName}.zip"`);

    return new Response(stream, { headers });

  } catch (error) {
    console.error('Error downloading test result:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download test result' },
      { status: 500 }
    );
  }
} 