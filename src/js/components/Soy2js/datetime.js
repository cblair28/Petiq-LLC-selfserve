import { missing } from './utils.js';

export const sameDay = (startdate, enddate) => {
  let startDateObject = new Date(secToMillisecond(startdate));
  let endDateObject = new Date(secToMillisecond(enddate));
  if (startDateObject.getUTCFullYear() !== endDateObject.getUTCFullYear()) return false;
  if (startDateObject.getUTCMonth() !== endDateObject.getUTCMonth()) return false;
  if (startDateObject.getUTCDate() !== endDateObject.getUTCDate()) return false;
  return true;
}

export const sameMonth = (startdate, enddate) => {
  let startDateObject = new Date(secToMillisecond(startdate));
  let endDateObject = new Date(secToMillisecond(enddate));
  return startDateObject.getUTCFullYear() === endDateObject.getUTCFullYear() && startDateObject.getUTCMonth() === endDateObject.getUTCMonth();
}

export const sameYear = (startdate, enddate) => {
  let startDateObject = new Date(secToMillisecond(startdate));
  let endDateObject = new Date(secToMillisecond(enddate));
  return startDateObject.getUTCFullYear() === endDateObject.getUTCFullYear();
}

export const currentYear = () => {
  return new Date().getFullYear();
}

export const ltimef = (locale, format, timestamp) => {
  // GENERATOR TODO: Implement ltimef
  missing("ltimef");
}

export const ltimestampf = (locale, format, timestamp) => {
  // GENERATOR TODO: Implement ltimestampf
  missing("ltimestampf");
}

// @format - Hour and minute format in Go time format syntax, e.g. '3:04'
// @time - Hour and minute encode into a number as hour*100 + minute.  For example, 3:04PM would be 304.
export const timef = (format, time) => {
  let date = new Date(2006, 1, 1, time/100, time%100);
  return timestampf(format, date.getTime());
};

// @format - Format in Go time format syntax, e.g. 'Mon Jan 2 15:04:05 -0700 MST 2006'
export const timestampf = (format, timestamp) => {
  // format = "Mon Jan 2 15:04:05 -0700 MST 2006"
  let date = new Date(timestamp);
  let year = date.getFullYear();
  let dayNumber = date.getDate();
  let dayOfWeek = date.getDay();
  let monthNumber = date.getMonth();
  let hour = date.getHours();
  let min = date.getMinutes();
  let sec = date.getSeconds();
  let offset = date.getTimezoneOffset();

  let weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  let months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  // format strings mostly from: http://momentjs.com/docs/
  format = format.replace("2006", "YYYY");
  format = format.replace("06", "YY");
  format = format.replace("January", "MMMM");
  format = format.replace("Jan", "MMM");
  format = format.replace("02", "DD");
  format = format.replace("2", "D");
  format = format.replace("15", "HH");
  format = format.replace("03", "h");
  format = format.replace("3", "h");
  format = format.replace("01", "MM");
  format = format.replace("1", "M");
  format = format.replace("PM", "BEFORENOON");
  format = format.replace("pm", "beforenoon");
  format = format.replace("04", "mm");
  format = format.replace("05", "ss");
  format = format.replace("-0700", "Z");
  format = format.replace("Monday", "dddd");
  format = format.replace("Mon", "ddd");
  format = format.replace("Mo", "dd");

  const displayMonthNumber = monthNumber + 1;

  const replaceMap = {
    "YYYY": year,
    "YY": year % 100,
    "MMMM": months[monthNumber],
    "MMM": months[monthNumber].substring(0,3),
    "MM": displayMonthNumber < 10 ? `0${displayMonthNumber}` : displayMonthNumber,
    "M": displayMonthNumber,
    "DD": dayNumber < 10 ? `0${dayNumber}` : dayNumber,
    "D": dayNumber,
    "HH": hour <= 9 ? "0" + hour : hour,
    "h": (hour === 0 || hour === 12) ? 12 : hour % 12,
    "BEFORENOON": hour >= 12 ? "PM" : "AM",
    "beforenoon": hour >= 12 ? "pm" : "am",
    "mm": min < 10 ? `0${min}` : min,
    "ss": sec < 10 ? `0${sec}` : sec,
    "Z": offset,
    "dddd": weekdays[dayOfWeek],
    "ddd": weekdays[dayOfWeek].substring(0,3),
    "dd": weekdays[dayOfWeek].substring(0,2)
  }

  const re = new RegExp(Object.keys(replaceMap).join('|'), "g");
  const result = format.replace(re, match => replaceMap[match]);

  return result;
};

export const dateToTimestamp = (date) => {
  let day = date.day,
      month = date.month - 1,
      year = date.year;
  return new Date(Date.UTC(year, month, day)).setUTCHours(0)/1000;
}

const secToMillisecond = (timestamp) => {
  return timestamp * 1000;
};
