import emailjs from 'emailjs-com';

const DEFAULT_SERVICE_ID = 'service_742oajo';
const DEFAULT_TEMPLATE_ID = 'template_mk11yaq';
const DEFAULT_PUBLIC_KEY = 'Zyf1nHcE0NKucw1go';

emailjs.init(DEFAULT_PUBLIC_KEY);

export function initEmail(publicKey) {
  emailjs.init(publicKey || DEFAULT_PUBLIC_KEY);
}

export async function sendEmail({ serviceId, templateId, to, subject, body, from_name = 'Lumé Haus Tracker' }) {
  const sId = serviceId || DEFAULT_SERVICE_ID;
  const tId = templateId || DEFAULT_TEMPLATE_ID;
  if (!to) { console.warn('No recipient email set'); return false; }
  try {
    await emailjs.send(sId, tId, {
      to_email: to,
      to_name: to,
      from_name,
      subject,
      message: body,
    });
    return true;
  } catch (e) {
    console.error('Email send failed:', e);
    return false;
  }
}

export async function sendTaskAlert({ emailConfig, taskTitle, projectTitle, status, providerName }) {
  return sendEmail({
    serviceId: emailConfig?.serviceId,
    templateId: emailConfig?.templateId,
    to: emailConfig?.adminEmail,
    subject: `⚠️ Task Update: ${status} — ${taskTitle}`,
    body: `A task needs your attention on the Lumé Haus Tracker.\n\nTask: ${taskTitle}\nProject: ${projectTitle}\nStatus: ${status}\nUpdated by: ${providerName}\n\nLog in to review: https://dashboard.lumehaus.health`,
  });
}

export async function sendHoursApproval({ emailConfig, vaName, weekLabel, hours, details }) {
  return sendEmail({
    serviceId: emailConfig?.serviceId,
    templateId: emailConfig?.templateId,
    to: emailConfig?.adminEmail,
    subject: `⏱️ Hours Approval Request — ${vaName} · ${weekLabel}`,
    body: `${vaName} has submitted hours for approval.\n\nWeek: ${weekLabel}\nTotal Hours: ${hours}\n\nBreakdown:\n${details}\n\nLog in to approve: https://dashboard.lumehaus.health`,
  });
}

export async function sendPayrollSummary({ emailConfig, providerName, month, totalPay, breakdown }) {
  return sendEmail({
    serviceId: emailConfig?.serviceId,
    templateId: emailConfig?.templateId,
    to: emailConfig?.adminEmail,
    subject: `💵 Payroll Summary — ${providerName} · ${month}`,
    body: `Payroll Summary\n\nProvider: ${providerName}\nMonth: ${month}\nTotal Pay: ${totalPay}\n\n${breakdown}\n\nLumé Haus by CornerstoneMD`,
  });
}
