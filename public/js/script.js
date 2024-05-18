const boxes = document.querySelectorAll(".scroll-effect");
const windowHeight = window.innerHeight;
let ticking = false;
const counters = [
  { id: 'totalProducts', endValue: 900, interval: 10 },
  { id: 'totalSuppliers', endValue: 500, interval: 10},
  { id: 'totalCustomers', endValue: 600 , interval: 10 } 
];
let countingInProgress = {};
let lastScrollY = {};

window.addEventListener("scroll", function () {
  if (!ticking) {
    window.requestAnimationFrame(function () {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > (lastScrollY[this.counterId] || 0);
      if (isScrollingDown) {
        toggleOpacity();
        checkCountersVisibility();
      }
      lastScrollY[this.counterId] = currentScrollY;
      ticking = false;
    });
    ticking = true;
  }
}.bind({ counterId: 'scroll-effect' }));

function toggleOpacity() {
  const bottomTrigger = (windowHeight / 5) * 4;

  boxes.forEach((box) => {
    const boxTop = box.getBoundingClientRect().top;
    if (boxTop < bottomTrigger) {
      box.style.opacity = "1";
      box.style.transition = "opacity 0.5s ease-in-out";
    } else {
      box.style.opacity = "0";
    }
  });
}

function checkCountersVisibility() {
  const bottomTrigger = (windowHeight / 5) * 4;

  counters.forEach(counter => {
    const element = document.getElementById(counter.id);
    const topofElement = element.getBoundingClientRect().top;
    if (topofElement < bottomTrigger && !countingInProgress[counter.id]) {
      countingInProgress[counter.id] = true;
      startCounter(element, 5, counter.endValue, counter.interval, counter.id);
    }
  });
}

function startCounter(item, increaseValue, total, intervalTime, counterId) {
  let count = 0;
  const intervalId = setInterval(() => {
    if (count < total) {
      count += increaseValue;
      item.innerHTML = count+" K";
    } else {
      clearInterval(intervalId);
      countingInProgress[counterId] = false;
    }
  }, intervalTime);
}
