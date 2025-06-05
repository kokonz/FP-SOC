export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  
  // If invalid date, return empty string
  if (isNaN(d.getTime())) {
    return '';
  }

  // Format: "DD MMM YYYY, HH:mm"
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
};
