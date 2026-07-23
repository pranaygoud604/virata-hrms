import { toDateKey } from '../leave/working-days.util';

export interface AttendanceSummary {
  workingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  onLeaveDays: number;
  unrecordedAbsentDays: number;
}

export interface DayAttendance {
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE';
}

/**
 * Attendance/leave/absence for a set of working days. Precedence for a given
 * day: an actual attendance record wins over a leave request covering the
 * same date (an employee who both checked in and had leave approved for the
 * same day is counted as present, since that's what actually happened).
 */
export function summarizeAttendance(
  workingDays: Date[],
  attendanceByDate: Map<string, DayAttendance>,
  leaveByDate: Set<string>,
): AttendanceSummary {
  const summary: AttendanceSummary = {
    workingDays: workingDays.length,
    presentDays: 0,
    lateDays: 0,
    halfDays: 0,
    onLeaveDays: 0,
    unrecordedAbsentDays: 0,
  };

  for (const day of workingDays) {
    const key = toDateKey(day);
    const attendance = attendanceByDate.get(key);
    if (attendance?.status === 'PRESENT') {
      summary.presentDays += 1;
    } else if (attendance?.status === 'LATE') {
      summary.lateDays += 1;
    } else if (attendance?.status === 'HALF_DAY') {
      summary.halfDays += 1;
    } else if (leaveByDate.has(key)) {
      summary.onLeaveDays += 1;
    } else {
      summary.unrecordedAbsentDays += 1;
    }
  }

  return summary;
}
