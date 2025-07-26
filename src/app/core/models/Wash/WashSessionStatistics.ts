import { WashSession } from "./WashSession";

export class WashSessionStatistics {
  static calculateAverageDuration(sessions: WashSession[]): number {
    const completedSessions = sessions.filter(s => s.isCompleted && s.washDurationMinutes);
    if (completedSessions.length === 0) return 0;

    const totalMinutes = completedSessions.reduce(
      (sum, session) => sum + (session.washDurationMinutes || 0), 0
    );
    return totalMinutes / completedSessions.length;
  }

  static calculateCustomerRating(sessions: WashSession[]): number {
    const ratedSessions = sessions.filter(s => s.customerRating !== undefined);
    if (ratedSessions.length === 0) return 0;

    const totalRating = ratedSessions.reduce(
      (sum, session) => sum + (session.customerRating || 0), 0
    );
    return totalRating / ratedSessions.length;
  }
}
