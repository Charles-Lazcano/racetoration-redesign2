const ALLOWED_ORIGINS = new Set([
  "https://racetoration.com",
  "https://www.racetoration.com",
]);

const FROM_EMAIL = "Racetoration Website <forms@racetoration.com>";
// Email clients only render remotely-hosted images, so this points at the
// live site rather than a local file. Background matches BRAND.headerBg
// exactly, so it blends into the header with no visible edges.
const LOGO_URL = "https://racetoration.com/assets/images/logo-wordmark.png";

const REQUIRED_FIELDS = ["name", "email", "phone", "make", "model", "year"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pulled from styles.css :root. `muted` and `divider` aren't defined there, so
// they're approximated to fit the gold/cream/brick-red palette.
const BRAND = {
  outerBg: "#C9A63D", // --mustard-dark
  headerBg: "#E3D26F", // --mustard
  cardBg: "#FBF6E3", // --cream
  ink: "#2B2118", // --ink
  red: "#C0392B", // --red
  redDark: "#962B20", // --red-dark
  muted: "#6E6354", // approximated
  divider: "#E6DCC3", // approximated
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://racetoration.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(request, body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}

// Escapes every character HTML would otherwise interpret as markup, so any
// user-supplied field is inert text no matter what the submitter typed.
function htmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCentralTimestamp(date) {
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)} CT`;
}

function detailRow(label, value) {
  return `
              <tr>
                <td style="padding:10px 0; border-bottom:1px solid ${BRAND.divider}; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:bold; color:${BRAND.redDark}; text-transform:uppercase; letter-spacing:0.05em; width:90px; vertical-align:top; white-space:nowrap;">${label}</td>
                <td style="padding:10px 0 10px 16px; border-bottom:1px solid ${BRAND.divider}; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:${BRAND.ink}; vertical-align:top;">${value}</td>
              </tr>`;
}

// Builds the notification email as HTML. Every user-supplied value (name,
// email, phone, vehicle, message) is passed through htmlEscape() before it's
// interpolated, so submitted text can never break out of the markup it's
// placed in. The mailto: links use encodeURIComponent() instead, which is the
// correct escaping for a URL rather than for HTML content.
function buildHtmlEmail({ name, email, phone, make, model, year, message, timestamp }) {
  const safeName = htmlEscape(name);
  const safeEmail = htmlEscape(email);
  const safePhone = htmlEscape(phone);
  const safeVehicle = htmlEscape(`${year} ${make} ${model}`);
  const safeMessage = htmlEscape(message || "(none provided)").replace(/\n/g, "<br>");
  const safeTimestamp = htmlEscape(timestamp);
  // Pre-fills the reply draft. Built from the raw (unescaped) values on
  // purpose — this is a mailto URL parameter, not HTML, so htmlEscape()
  // would leak literal "&amp;" etc. into the customer's draft. encodeURIComponent()
  // is the correct + sufficient escaping for this context.
  const replySubject = "Re: Your quote request — Racetoration";
  const replyBody = `Hi ${name},\n\nThanks for reaching out about your ${year} ${make} ${model}.\n\n`;
  const mailtoHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    replySubject
  )}&body=${encodeURIComponent(replyBody)}`;

  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:${BRAND.outerBg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.outerBg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:${BRAND.cardBg}; border:6px solid ${BRAND.ink};">

            <!-- Header -->
            <tr>
              <td style="background-color:${BRAND.headerBg}; padding:28px 32px 24px; text-align:center;">
                <img src="${LOGO_URL}" width="176" height="56" alt="Racetoration" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-weight:bold; font-size:14px; letter-spacing:0.08em; text-transform:uppercase; color:${BRAND.redDark}; margin-top:14px;">New Quote Request</div>
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:${BRAND.muted}; margin-top:6px;">Received: ${safeTimestamp}</div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="background-color:${BRAND.cardBg}; padding:28px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow("Name", safeName)}
${detailRow("Email", `<a href="${mailtoHref}" style="color:${BRAND.ink}; text-decoration:underline;">${safeEmail}</a>`)}
${detailRow("Phone", safePhone)}
${detailRow("Vehicle", safeVehicle)}
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px; border:1px solid ${BRAND.red};">
                  <tr>
                    <td style="padding:14px 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:bold; color:${BRAND.redDark}; text-transform:uppercase; letter-spacing:0.05em;">Message</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 16px 16px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:${BRAND.ink};">${safeMessage}</td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background-color:${BRAND.red};">
                            <a href="${mailtoHref}" style="display:inline-block; padding:14px 32px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; color:#FFFFFF; text-decoration:none;">Reply to Customer</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse(request, { success: false, error: "Invalid request body." }, 400);
  }

  // Honeypot: bots fill in hidden fields. Pretend success so bots don't retry.
  if (data.botcheck) {
    return jsonResponse(request, { success: true }, 200);
  }

  const missing = REQUIRED_FIELDS.filter((field) => !String(data[field] ?? "").trim());
  if (missing.length) {
    return jsonResponse(
      request,
      { success: false, error: `Please fill in: ${missing.join(", ")}.` },
      400
    );
  }

  const name = String(data.name).trim();
  const email = String(data.email).trim();
  const phone = String(data.phone).trim();
  const make = String(data.make).trim();
  const model = String(data.model).trim();
  const year = String(data.year).trim();
  const message = String(data.message ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return jsonResponse(request, { success: false, error: "Please enter a valid email address." }, 400);
  }

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 2027) {
    return jsonResponse(request, { success: false, error: "Please enter a valid vehicle year." }, 400);
  }

  if (!env.RESEND_API_KEY || !env.TO_EMAIL) {
    return jsonResponse(request, { success: false, error: "Server is not configured to send email." }, 500);
  }

  const timestamp = formatCentralTimestamp(new Date());

  const textBody = [
    `New quote request from racetoration.com`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Vehicle: ${year} ${make} ${model}`,
    ``,
    `Message:`,
    message || "(none provided)",
  ].join("\n");

  const htmlBody = buildHtmlEmail({ name, email, phone, make, model, year, message, timestamp });

  let resendResponse;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [env.TO_EMAIL],
        reply_to: email,
        subject: `New quote request from ${name} — racetoration.com`,
        text: textBody,
        html: htmlBody,
      }),
    });
  } catch {
    return jsonResponse(request, { success: false, error: "Failed to reach the email service." }, 502);
  }

  if (!resendResponse.ok) {
    return jsonResponse(request, { success: false, error: "Failed to send your request. Please try again." }, 502);
  }

  return jsonResponse(request, { success: true }, 200);
}
