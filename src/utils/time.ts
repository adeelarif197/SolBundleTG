import moment from "moment-timezone";
export function getNow() {
  return moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
}

export function getNowTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSecondsElapsed(timestamp: number) {
  return getNowTimestamp() - timestamp;
}
