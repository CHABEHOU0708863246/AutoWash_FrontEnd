// ScheduleSettings.ts - Version corrigée

import { DayOfWeek } from "./DayOfWeek";
import { DaySchedule } from "./DaySchedule";
import { SpecialSchedule } from "./SpecialSchedule";

export class ScheduleSettings {
  weeklySchedule: Map<DayOfWeek, DaySchedule>;
  specialDays: SpecialSchedule[];
  is24Hours: boolean;
  defaultOpenTime: string; // Format "HH:mm"
  defaultCloseTime: string; // Format "HH:mm"

  constructor(init?: Partial<ScheduleSettings>) {
    this.weeklySchedule = new Map<DayOfWeek, DaySchedule>();
    if (init?.weeklySchedule) {
      // Gérer les cas où weeklySchedule est un objet ou un Map
      if (init.weeklySchedule instanceof Map) {
        this.weeklySchedule = new Map(init.weeklySchedule);
      } else {
        Object.entries(init.weeklySchedule).forEach(([key, value]) => {
          this.weeklySchedule.set(key as DayOfWeek, new DaySchedule(value as Partial<DaySchedule>));

        });
      }
    } else {
      // Initialisation par défaut
      Object.values(DayOfWeek).forEach(day => {
        this.weeklySchedule.set(day, new DaySchedule());
      });
    }

    this.specialDays = init?.specialDays?.map(s => new SpecialSchedule(s)) || [];
    this.is24Hours = init?.is24Hours || false;
    this.defaultOpenTime = init?.defaultOpenTime || "07:00";
    this.defaultCloseTime = init?.defaultCloseTime || "19:00";
  }

  /**
   * Convertir en TimeSpan format pour le backend C#
   */
  private convertToTimeSpan(time: string): string {
    if (!time || !time.includes(':')) {
      return "00:00:00";
    }
    return `${time}:00`; // Convertir "HH:mm" en "HH:mm:ss"
  }

  /**
   * Convertir la Map en objet pour la sérialisation JSON
   */
  toJSON(): any {
    // Convertir la Map en objet simple
    const weeklyScheduleObj: { [key: string]: any } = {};
    this.weeklySchedule.forEach((schedule, day) => {
      weeklyScheduleObj[day] = {
        isOpen: schedule.isOpen,
        openTime: this.convertToTimeSpan(schedule.openTime),
        closeTime: this.convertToTimeSpan(schedule.closeTime),
        breaks: schedule.breaks.map(b => ({
          startTime: this.convertToTimeSpan(b.startTime),
          endTime: this.convertToTimeSpan(b.endTime),
          description: b.description
        }))
      };
    });

    return {
      weeklySchedule: weeklyScheduleObj,
      specialDays: this.specialDays.map(s => ({
        date: s.date.toISOString().split('T')[0], // Format YYYY-MM-DD
        isClosed: s.isClosed,
        specialOpenTime: s.specialOpenTime ? this.convertToTimeSpan(s.specialOpenTime) : undefined,
        specialCloseTime: s.specialCloseTime ? this.convertToTimeSpan(s.specialCloseTime) : undefined,
        reason: s.reason || "Jour férié"
      })),
      is24Hours: this.is24Hours,
      defaultOpenTime: this.convertToTimeSpan(this.defaultOpenTime),
      defaultCloseTime: this.convertToTimeSpan(this.defaultCloseTime)
    };
  }

  /**
   * Méthode pour créer un objet compatible avec le backend
   */
  toBackendFormat(): any {
    return this.toJSON();
  }
}
