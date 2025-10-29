/**
 * Calculate date range based on timeRange and date
 * @param {string} timeRange - "daily", "weekly", "monthly", "yearly"
 * @param {string} date - ISO date string
 * @returns {object} { startDate, endDate }
 */
export const getDateRange = (timeRange, date) => {
  const selectedDate = date ? new Date(date) : new Date();
  let startDate, endDate;

  switch (timeRange) {
    case "daily":
      // Same day (00:00 to 23:59)
      startDate = new Date(selectedDate.setHours(0, 0, 0, 0));
      endDate = new Date(selectedDate.setHours(23, 59, 59, 999));
      break;

    case "weekly":
      // 7 days from selected date (start of week to end of week)
      const dayOfWeek = selectedDate.getDay();
      startDate = new Date(selectedDate);
      startDate.setDate(selectedDate.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "monthly":
      // Entire month of selected date
      startDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
        0,
        0,
        0,
        0
      );
      endDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      break;

    case "yearly":
      // Entire year of selected date
      startDate = new Date(selectedDate.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    default:
      // Default to daily
      startDate = new Date(selectedDate.setHours(0, 0, 0, 0));
      endDate = new Date(selectedDate.setHours(23, 59, 59, 999));
  }

  return { startDate, endDate };
};

/**
 * Format seconds to hours (decimal)
 * @param {number} seconds - Duration in seconds
 * @returns {number} Hours as decimal (e.g., 7200 seconds = 2.00 hours)
 */
export const formatHours = (seconds) => {
  if (!seconds || seconds === 0) return 0;
  return parseFloat((seconds / 3600).toFixed(2));
};

/**
 * Format date range for display
 * @param {string} timeRange - "daily", "weekly", "monthly", "yearly"
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} Formatted date range string
 */
export const formatDateRangeDisplay = (timeRange, startDate, endDate) => {
  const options = { year: "numeric", month: "long", day: "numeric" };

  switch (timeRange) {
    case "daily":
      return startDate.toLocaleDateString("en-US", options);

    case "weekly":
      return `${startDate.toLocaleDateString(
        "en-US",
        options
      )} - ${endDate.toLocaleDateString("en-US", options)}`;

    case "monthly":
      return startDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });

    case "yearly":
      return startDate.getFullYear().toString();

    default:
      return startDate.toLocaleDateString("en-US", options);
  }
};
