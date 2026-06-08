import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { sendOrderConfirmationEmail, sendStatusUpdateEmail, sendInvoiceEmail } from "@/lib/email";
import { generateInvoicePDF } from "@/lib/invoice";

// Vercel Cron will send a GET or POST request
export async function GET(req: Request) {
  try {
    const supabase = createServiceRoleClient();

    // 1. Claim up to 10 pending jobs
    const { data: jobs, error: claimError } = await supabase.rpc('claim_email_jobs', { batch_size: 10 });
    
    if (claimError) {
      console.error("Failed to claim email jobs:", claimError);
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processedCount = 0;

    for (const job of jobs) {
      try {
        const { orderId } = job.payload;
        if (!orderId) throw new Error("Missing orderId in job payload");

        // Fetch Order
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (orderError || !order) throw new Error(`Order ${orderId} not found`);

        // Fetch Order Items
        const { data: items } = await supabase
          .from("order_items")
          .select("*, products(name, image_url)")
          .eq("order_id", orderId);

        if (job.type === 'ORDER_CONFIRMATION') {
          await sendOrderConfirmationEmail({
            orderId: order.id,
            orderDate: order.created_at,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            shippingAddress: order.shipping_address,
            totalAmount: order.total_amount,
            items: items || [],
            trackingId: order.tracking_id,
            carrier: order.carrier
          });
        } 
        else if (job.type === 'STATUS_UPDATE') {
          const { status, remarks } = job.payload;
          await sendStatusUpdateEmail({
              orderId: order.id,
              orderDate: order.created_at,
              customerName: order.customer_name,
              customerEmail: order.customer_email,
              shippingAddress: order.shipping_address,
              totalAmount: order.total_amount,
              items: items || [],
              trackingId: order.tracking_id,
              carrier: order.carrier
            },
            status || order.status,
            remarks
          );
        }
        else if (job.type === 'INVOICE') {
          // Check if invoice exists and has PDF, otherwise generate it
          const { data: invoice } = await supabase
            .from("invoices")
            .select("id, pdf_url")
            .eq("order_id", orderId)
            .single();
            
          let finalPdfUrl = invoice?.pdf_url;
          
          if (invoice && !finalPdfUrl) {
            // Generate it now
            const { generateAndStoreInvoicePDF } = await import("@/app/actions/invoice-generator");
            const res = await generateAndStoreInvoicePDF(invoice.id);
            if (res.success) finalPdfUrl = res.pdfUrl;
          }

          let pdfBase64 = "";
          if (finalPdfUrl) {
            const { data: fileData, error: fileError } = await supabase.storage.from("invoices").download(finalPdfUrl);
            if (!fileError && fileData) {
              const arrayBuffer = await fileData.arrayBuffer();
              pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
            }
          }

          if (!pdfBase64) {
            throw new Error("Could not retrieve Invoice PDF for email");
          }

          await sendInvoiceEmail(
            order.customer_email,
            order.customer_name,
            order.id,
            pdfBase64
          );
        }

        // Mark as COMPLETED
        await supabase.from('email_queue').update({
          status: 'COMPLETED',
          updated_at: new Date().toISOString()
        }).eq('id', job.id);

        processedCount++;
      } catch (err: any) {
        console.error(`Job ${job.id} failed:`, err);
        // Mark as FAILED
        await supabase.from('email_queue').update({
          status: 'FAILED',
          error: err.message || "Unknown error",
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (err: any) {
    console.error("Error processing email queue:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Support POST as well if triggered manually via webhooks
export const POST = GET;
