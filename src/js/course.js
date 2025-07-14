export function initCourseMap() {
  // Add a 20ms delay before loading the iframe
  setTimeout(function() {
    const courseMap = document.getElementById('course-map');
    if (courseMap) {
      courseMap.src = "https://www.plotaroute.com/embedmap/332770?maptype=paths";
    }
  }, 0);
}