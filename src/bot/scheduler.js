const cron = require('node-cron');
const dayjs = require('dayjs');
const { getConfig } = require('../storage/configStore');

/**
 * Helper to get the actual payday adjusted for weekends (last working day)
 */
function getActualPayday(date, payDay) {
  let d = date.date(payDay);
  // Ensure we don't overflow the month (e.g. Feb 30)
  if (d.date() !== payDay && payDay > 28) {
    d = date.endOf('month');
  }
  
  const dayOfWeek = d.day(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 6) return d.subtract(1, 'day');
  if (dayOfWeek === 0) return d.subtract(2, 'day');
  return d;
}

/**
 * Initializes all cron jobs for the bot
 */
function initScheduler(bot) {
  // Check every day at 08:00 AM
  // Format: second minute hour day-of-month month day-of-week
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running payday check...');
    try {
      const config = await getConfig();
      const payDay = config.budget_cycle_day || 25;
      const today = dayjs();
      
      const actualPayday = getActualPayday(today, payDay);
      
      // If today is the actual payday, send notification
      if (today.isSame(actualPayday, 'day')) {
        console.log('[Scheduler] Payday detected! Sending notifications...');
        
        const message = `*Halo Bang! Hari ini Gajian lho!* 💸\n\nSelamat foya-foya (tapi tetep catet pengeluaran ya!) 🤑\n\nSiklus keuangan lo udah reset hari ini. Semangat kerjanya biar bulan depan gajian lagi! 🚀`;
        
        // Send to all whitelisted users
        if (config.whitelisted_users && config.whitelisted_users.length > 0) {
          for (const userId of config.whitelisted_users) {
            try {
              await bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
              console.log(`[Scheduler] Notification sent to ${userId}`);
            } catch (sendErr) {
              console.error(`[Scheduler] Failed to send message to ${userId}:`, sendErr.message);
            }
          }
        }
      } else {
        console.log(`[Scheduler] Today is not payday. (Actual Payday: ${actualPayday.format('YYYY-MM-DD')})`);
      }
    } catch (err) {
      console.error('[Scheduler] Critical error in payday cron:', err.message);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Jakarta" // Biar pas jam 8 WIB
  });

  console.log('[Scheduler] Payday reminder system active (08:00 AM WIB daily).');
}

module.exports = { initScheduler };
