import { NextResponse } from 'next/server';
import { DashboardService } from '@/lib/dashboard/dashboard-service';

export async function GET() {
  try {
    const stats = await DashboardService.getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 