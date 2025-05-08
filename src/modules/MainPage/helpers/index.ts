export function splitTimeString(time: Date | string) {
  if (time instanceof Date) {
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return [hours, minutes];
  }
  return time.split(':');
}