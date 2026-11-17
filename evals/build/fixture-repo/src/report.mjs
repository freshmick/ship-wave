import { formatDuration } from './duration.mjs';
import { formatMoney } from './money.mjs';

// One line per trip, then a total line.
export function buildReport(trips) {
  const lines = trips.map((trip) => `${trip.date}  ${trip.route}  ${formatDuration(trip.seconds)}  ${formatMoney(trip.fee)}`);
  const seconds = trips.reduce((sum, trip) => sum + trip.seconds, 0);
  const fee = trips.reduce((sum, trip) => sum + trip.fee, 0);
  return [...lines, `total  ${trips.length} trips  ${formatDuration(seconds)}  ${formatMoney(fee)}`];
}
