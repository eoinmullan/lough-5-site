const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function padToTwoDigits(value) {
  return String(value).padStart(2, '0');
}

export function registrationCountdown(opensAtIso) {
  return {
    opensAt: new Date(opensAtIso).getTime(),
    remainingMs: 0,
    timerId: null,

    init() {
      this.tick();
      if (!this.isOpen) {
        this.timerId = setInterval(() => this.tick(), MS_PER_SECOND);
      }
    },

    destroy() {
      clearInterval(this.timerId);
    },

    tick() {
      this.remainingMs = Math.max(0, this.opensAt - Date.now());
      if (this.isOpen) {
        clearInterval(this.timerId);
      }
    },

    get isOpen() {
      return this.remainingMs === 0;
    },

    get days() {
      return Math.floor(this.remainingMs / MS_PER_DAY);
    },

    get hours() {
      return padToTwoDigits(Math.floor((this.remainingMs % MS_PER_DAY) / MS_PER_HOUR));
    },

    get minutes() {
      return padToTwoDigits(Math.floor((this.remainingMs % MS_PER_HOUR) / MS_PER_MINUTE));
    },

    get seconds() {
      return padToTwoDigits(Math.floor((this.remainingMs % MS_PER_MINUTE) / MS_PER_SECOND));
    },
  };
}
