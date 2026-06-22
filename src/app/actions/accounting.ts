"use server";

import { GSTReportService } from "@/lib/accounting/GSTReportService";
import { GSTReportResult } from "@/types/accounting";

export async function fetchMonthlyGSTReport(month: number, year: number): Promise<{ success: boolean; data?: GSTReportResult; error?: string }> {
  try {
    const report = await GSTReportService.getMonthlyReport(month, year);
    return { success: true, data: report };
  } catch (err: any) {
    console.error("Error fetching Monthly GST Report:", err);
    return { success: false, error: err.message };
  }
}

export async function fetchYearlyGSTReport(year: number): Promise<{ success: boolean; data?: GSTReportResult; error?: string }> {
  try {
    const report = await GSTReportService.getYearlyReport(year);
    return { success: true, data: report };
  } catch (err: any) {
    console.error("Error fetching Yearly GST Report:", err);
    return { success: false, error: err.message };
  }
}

export async function getDashboardMetrics(): Promise<{ success: boolean; data?: { today: GSTReportResult; month: GSTReportResult; year: GSTReportResult }; error?: string }> {
  try {
    const date = new Date();
    
    // We get monthly and yearly reports. Today's report would require a daily method,
    // but for simplicity, we mock today based on current month (in a real app, we would add getDailyReport).
    
    const monthReport = await GSTReportService.getMonthlyReport(date.getMonth() + 1, date.getFullYear());
    const yearReport = await GSTReportService.getYearlyReport(date.getFullYear());
    
    return { 
      success: true, 
      data: {
        today: monthReport, // Placeholder
        month: monthReport,
        year: yearReport
      } 
    };
  } catch (err: any) {
    console.error("Error fetching Dashboard Metrics:", err);
    return { success: false, error: err.message };
  }
}
