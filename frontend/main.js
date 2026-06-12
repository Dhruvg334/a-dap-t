// Premium Smooth Scrolling

const lenisScript = document.createElement("script");
lenisScript.src =
  "https://unpkg.com/@studio-freight/lenis@1.0.42/bundled/lenis.min.js";

lenisScript.onload = () => {
  const lenis = new Lenis({
    duration: 3.2,
    smoothWheel: true,
    wheelMultiplier: 0.8,
    touchMultiplier: 1.2,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
};
    ``
document.head.appendChild(lenisScript);