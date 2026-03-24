export function isMealPast(dateStr: string, slotStr: string): boolean {
  if (!dateStr || !slotStr) return false;
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const date = parseInt(parts[2], 10);
  
  const targetDate = new Date(year, month, date);
  
  if (slotStr === 'breakfast') {
    targetDate.setHours(11, 0, 0, 0); // 11 AM
  } else if (slotStr === 'lunch') {
    targetDate.setHours(15, 0, 0, 0); // 3 PM
  } else if (slotStr === 'dinner') {
    targetDate.setHours(22, 0, 0, 0); // 10 PM
  }
  
  const now = new Date();
  return now > targetDate;
}
