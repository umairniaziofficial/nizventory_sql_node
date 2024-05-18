const boxes = document.querySelectorAll(".scroll-effect");
const windowHeight = window.innerHeight;
let ticking = false;

window.addEventListener("scroll", function() {
    if (!ticking) {
        window.requestAnimationFrame(function() {
            toggleOpacity();
            ticking = false;
        });
        ticking = true;
    }
});

function toggleOpacity() {
    const bottomTrigger = windowHeight / 5 * 4;

    boxes.forEach(box => {
        const boxTop = box.getBoundingClientRect().top;
        if (boxTop < bottomTrigger) {
            box.style.opacity = "1";
            box.style.transition = "opacity 0.5s ease-in-out";
        } else {
            box.style.opacity = "0";
        }
    });
}
