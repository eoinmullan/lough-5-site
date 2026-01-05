export function initCourseMap() {
  // Defer iframe loading to next event loop tick to avoid blocking page render
  setTimeout(() => {
    const courseMap = document.getElementById('course-map');
    if (courseMap) {
      courseMap.src = "https://www.plotaroute.com/embedmap/332770?maptype=paths";
    }
  }, 0);
}