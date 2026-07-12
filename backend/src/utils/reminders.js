const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendEmail } = require('./mailer');

const checkLicenseExpiriesAndSendEmails = async (targetEmail = null) => {
  try {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(now.getDate() + 30);

    const drivers = await prisma.driver.findMany({
      where: { isActive: true }
    });

    const expiredDrivers = [];
    const expiringSoonDrivers = [];

    for (const d of drivers) {
      const expiry = new Date(d.licenseExpiry);
      if (expiry < now) {
        expiredDrivers.push(d);
      } else if (expiry <= thirtyDays) {
        expiringSoonDrivers.push(d);
      }
    }

    if (expiredDrivers.length === 0 && expiringSoonDrivers.length === 0) {
      console.log('[Reminder] No expiring or expired driver licenses found.');
      return { sent: false, expiredCount: 0, expiringSoonCount: 0 };
    }

    const emailRecipient = targetEmail || process.env.EMAIL_USER;
    if (!emailRecipient) {
      console.log('[Reminder] Skipped — no recipient email configured');
      return { sent: false, error: 'No recipient email configured' };
    }

    const expiredRows = expiredDrivers.map(d => `
      <tr style="border-bottom: 1px solid #475569;">
        <td style="padding: 10px; color: #f1f5f9;"><strong>${d.name}</strong></td>
        <td style="padding: 10px; color: #ef4444; font-weight: bold; font-family: monospace;">${d.licenseNumber}</td>
        <td style="padding: 10px; color: #ef4444; font-family: monospace;">${new Date(d.licenseExpiry).toLocaleDateString('en-IN')}</td>
        <td style="padding: 10px; color: #94a3b8;">${d.contactNumber}</td>
      </tr>
    `).join('');

    const expiringRows = expiringSoonDrivers.map(d => `
      <tr style="border-bottom: 1px solid #475569;">
        <td style="padding: 10px; color: #f1f5f9;"><strong>${d.name}</strong></td>
        <td style="padding: 10px; color: #f59e0b; font-weight: bold; font-family: monospace;">${d.licenseNumber}</td>
        <td style="padding: 10px; color: #f59e0b; font-family: monospace;">${new Date(d.licenseExpiry).toLocaleDateString('en-IN')}</td>
        <td style="padding: 10px; color: #94a3b8;">${d.contactNumber}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: monospace; padding: 24px; background-color: #1e293b; color: #f8fafc; border-radius: 16px; border: 1px solid #475569; max-width: 650px;">
        <h2 style="color: #f59e0b; margin-top: 0; letter-spacing: 0.05em; text-transform: uppercase; font-size: 18px;">TransitOps License Expiry Warning</h2>
        <p>This is a scheduled notification alert reporting expiring or expired driver licenses.</p>
        
        ${expiredDrivers.length > 0 ? `
          <h3 style="color: #ef4444; text-transform: uppercase; font-size: 14px; margin-top: 24px; border-bottom: 1px solid #ef4444; padding-bottom: 4px;">Expired Licenses</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            <thead>
              <tr style="text-align: left; color: #94a3b8; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Driver</th>
                <th style="padding: 8px 10px;">License No</th>
                <th style="padding: 8px 10px;">Expiry Date</th>
                <th style="padding: 8px 10px;">Contact</th>
              </tr>
            </thead>
            <tbody>
              ${expiredRows}
            </tbody>
          </table>
        ` : ''}

        ${expiringSoonDrivers.length > 0 ? `
          <h3 style="color: #f59e0b; text-transform: uppercase; font-size: 14px; margin-top: 24px; border-bottom: 1px solid #f59e0b; padding-bottom: 4px;">Expiring Within 30 Days</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            <thead>
              <tr style="text-align: left; color: #94a3b8; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Driver</th>
                <th style="padding: 8px 10px;">License No</th>
                <th style="padding: 8px 10px;">Expiry Date</th>
                <th style="padding: 8px 10px;">Contact</th>
              </tr>
            </thead>
            <tbody>
              ${expiringRows}
            </tbody>
          </table>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid #475569; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.4;">Please contact these drivers immediately to renew their documents or suspend dispatch assignments under settings.</p>
      </div>
    `;

    await sendEmail({
      to: emailRecipient,
      subject: `TransitOps Alert - Driver License Expiries (${expiredDrivers.length + expiringSoonDrivers.length} flagged)`,
      html: htmlContent
    });

    console.log(`[Reminder] Expiry notifications sent successfully to ${emailRecipient}`);

    // Send individual reminder emails to each driver who has an email configured
    const driversNotified = [];
    const allFlagged = [...expiredDrivers.map(d => ({ ...d, expired: true })), ...expiringSoonDrivers.map(d => ({ ...d, expired: false }))];
    
    for (const d of allFlagged) {
      if (d.email) {
        try {
          const expiryDate = new Date(d.licenseExpiry).toLocaleDateString('en-IN');
          const statusText = d.expired ? 'EXPIRED' : 'EXPIRING SOON';
          const alertColor = d.expired ? '#ef4444' : '#f59e0b';
          
          const driverHtml = `
            <div style="font-family: monospace; padding: 24px; background-color: #1e293b; color: #f8fafc; border-radius: 16px; border: 1px solid #475569; max-width: 500px;">
              <h2 style="color: ${alertColor}; margin-top: 0; text-transform: uppercase; font-size: 16px;">License Renewal Required</h2>
              <p>Dear ${d.name},</p>
              <p>This is a notification that your driver's license (<strong>${d.licenseNumber}</strong>) is flagged as <strong>${statusText}</strong>.</p>
              <p>License Expiry Date: <strong style="color: ${alertColor};">${expiryDate}</strong></p>
              <p>Please renew your license immediately and submit the updated documents to the fleet manager to remain active on dispatch trips.</p>
              <hr style="border: 0; border-top: 1px solid #475569; margin: 20px 0;" />
              <p style="font-size: 11px; color: #94a3b8;">TransitOps Automated System Notification</p>
            </div>
          `;
          
          await sendEmail({
            to: d.email,
            subject: `Action Required: Driver License Expiry Warning - ${d.name}`,
            html: driverHtml
          });
          driversNotified.push(d.name);
          console.log(`[Reminder] Sent individual expiry warning to driver ${d.name} (${d.email})`);
        } catch (e) {
          console.error(`[Reminder] Failed to send email to driver ${d.name}:`, e);
        }
      }
    }

    return { 
      sent: true, 
      expiredCount: expiredDrivers.length, 
      expiringSoonCount: expiringSoonDrivers.length,
      driversNotified
    };
  } catch (err) {
    console.error("[Reminder] Failed to process license expiry checks:", err);
    return { sent: false, error: err.message };
  }
};

module.exports = { checkLicenseExpiriesAndSendEmails };
