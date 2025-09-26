export class DateUtils {
  static formatDate(date) {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  }

  static formatDateTime(date) {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  }

  static getDaysDifference(date1, date2 = new Date()) {
    const d1 = date1.toDate ? date1.toDate() : new Date(date1);
    const d2 = date2.toDate ? date2.toDate() : new Date(date2);
    const diffTime = d1.getTime() - d2.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static formatTimeISO(date) {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toISOString().split('T')[0];
  }
}

