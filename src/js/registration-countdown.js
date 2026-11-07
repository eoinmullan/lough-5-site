import confetti from 'canvas-confetti';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const CELEBRATION_COLOURS = ['#ffca28', '#ffffff', '#333333'];
const CELEBRATION_DURATION_MS = 3000;

function celebrateRegistrationOpening() {
  const endTime = Date.now() + CELEBRATION_DURATION_MS;
  const burstFromBothSides = () => {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors: CELEBRATION_COLOURS, disableForReducedMotion: true });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors: CELEBRATION_COLOURS, disableForReducedMotion: true });
    if (Date.now() < endTime) {
      requestAnimationFrame(burstFromBothSides);
    }
  };
  confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 }, colors: CELEBRATION_COLOURS, disableForReducedMotion: true });
  burstFromBothSides();
}

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
        this.timerId = setInterval(() => this.tickUntilOpen(), MS_PER_SECOND);
      }
    },

    destroy() {
      clearInterval(this.timerId);
    },

    tick() {
      this.remainingMs = Math.max(0, this.opensAt - Date.now());
    },

    tickUntilOpen() {
      this.tick();
      if (this.isOpen) {
        clearInterval(this.timerId);
        celebrateRegistrationOpening();
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
