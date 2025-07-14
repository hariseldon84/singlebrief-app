import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CancellationRequest {
  briefId: string;
  briefTitle: string;
  recipients: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { briefId, briefTitle, recipients }: CancellationRequest = await req.json();

    console.log(`Sending cancellation emails for brief: ${briefTitle} to ${recipients.length} recipients`);

    // Send cancellation email to each recipient
    const emailPromises = recipients.map(async (email) => {
      try {
        const emailResponse = await resend.emails.send({
          from: "SingleBrief <noreply@singlebrief.com>",
          to: [email],
          subject: `Brief Cancelled: ${briefTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1e40af; margin-bottom: 20px;">Brief Cancelled</h1>
              
              <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                Hello,
              </p>
              
              <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                We wanted to let you know that the following brief has been cancelled and you no longer need to respond:
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #374151; margin: 0 0 10px 0; font-size: 18px;">${briefTitle}</h2>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Brief ID: ${briefId}</p>
              </div>
              
              <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                If you have any questions, please don't hesitate to reach out to the brief creator.
              </p>
              
              <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                Thank you!
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  This email was sent automatically by SingleBrief. Please do not reply to this email.
                </p>
              </div>
            </div>
          `,
        });

        console.log(`Email sent successfully to ${email}:`, emailResponse);
        return { email, success: true, response: emailResponse };
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        return { email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Email sending complete: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      briefId,
      briefTitle,
      totalRecipients: recipients.length,
      successful,
      failed,
      results
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-brief-cancellation function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);