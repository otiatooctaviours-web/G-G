(() => {
  const section = document.querySelector(".pricing-group");

  if (!section) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");

  const LERP = 0.15;
  const IDLE_OFFSET_Y = -0.18;

  const glow = document.createElement("div");

  glow.className = "pricing-glow";
  glow.setAttribute("aria-hidden", "true");
  section.prepend(glow);

  let sectionBox = { left: 0, top: 0, width: 0, height: 0 };
  let cardBoxes = [];
  let rest = { x: 0, y: 0 };
  let pos = { x: 0, y: 0 };
  let goal = { x: 0, y: 0 };
  let dirty = true;
  let inside = false;
  let placed = false;
  let frame = 0;
  let observer = null;

  const isStatic = () => reducedMotion.matches || coarsePointer.matches;

  const restTarget = () => {
    const featured = cardBoxes.find((box) => box.el.classList.contains("pricing-card-popular"));

    if (featured) {
      return { x: featured.cx, y: featured.cy + featured.h * IDLE_OFFSET_Y };
    }

    return { x: sectionBox.width * 0.5, y: sectionBox.height * 0.42 };
  };

  /* Reads happen here, outside the animation loop, so the loop stays write-only. */
  const measure = () => {
    const rect = section.getBoundingClientRect();

    sectionBox = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };

    cardBoxes = Array.from(section.querySelectorAll(".pricing-card"))
      .filter((card) => !card.closest("[hidden]"))
      .map((card) => {
        const box = card.getBoundingClientRect();
        const left = box.left - sectionBox.left;
        const top = box.top - sectionBox.top;

        return {
          el: card,
          left,
          top,
          w: box.width,
          h: box.height,
          cx: left + box.width / 2,
          cy: top + box.height / 2,
          mx: null,
          my: null,
        };
      });

    dirty = false;
    rest = restTarget();
  };

  const invalidate = () => {
    dirty = true;
  };

  const place = () => {
    glow.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
  };

  const stop = () => {
    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  const tick = () => {
    frame = 0;

    const dx = goal.x - pos.x;
    const dy = goal.y - pos.y;

    if (document.hidden || (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1)) {
      pos.x = goal.x;
      pos.y = goal.y;
      place();
      stop();
      return;
    }

    pos.x += dx * LERP;
    pos.y += dy * LERP;
    place();
    frame = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame || isStatic() || document.hidden) {
      return;
    }

    frame = window.requestAnimationFrame(tick);
  };

  const paintCards = (x, y) => {
    cardBoxes.forEach((box) => {
      const mx = Math.round(x - box.left);
      const my = Math.round(y - box.top);

      if (mx === box.mx && my === box.my) {
        return;
      }

      box.mx = mx;
      box.my = my;
      box.el.style.setProperty("--mx", `${mx}px`);
      box.el.style.setProperty("--my", `${my}px`);
    });
  };

  const onEnter = (event) => {
    if (isStatic()) {
      return;
    }

    if (dirty) {
      measure();
    }

    const x = event.clientX - sectionBox.left;
    const y = event.clientY - sectionBox.top;

    goal = { x, y };
    inside = true;
    paintCards(x, y);
    glow.classList.add("is-active");

    if (!placed) {
      pos = { x, y };
      placed = true;
      place();
    }

    start();
  };

  const onMove = (event) => {
    if (isStatic()) {
      return;
    }

    if (dirty) {
      measure();
    }

    const x = event.clientX - sectionBox.left;
    const y = event.clientY - sectionBox.top;

    goal = { x, y };
    inside = true;
    paintCards(x, y);

    glow.classList.add("is-active");
    start();
  };

  const onLeave = () => {
    if (isStatic()) {
      return;
    }

    if (dirty) {
      measure();
    }

    inside = false;
    placed = false;
    glow.classList.remove("is-active");
    goal = rest;
    start();
  };

  const onVisibility = () => {
    if (document.hidden) {
      stop();
      return;
    }

    if (inside && !isStatic()) {
      start();
    }
  };

  const sync = () => {
    dirty = true;
    measure();

    if (isStatic()) {
      stop();
      inside = false;
      placed = false;
      goal = rest;
      pos = { x: rest.x, y: rest.y };
      glow.classList.remove("is-active");
      glow.classList.add("is-static");
      place();
      return;
    }

    glow.classList.remove("is-static");
    goal = inside ? goal : rest;
    pos = inside ? pos : { x: rest.x, y: rest.y };
    place();

    if (inside) {
      start();
    }
  };

  const onModeChange = () => {
    sync();
  };

  const teardown = (event) => {
    if (event && event.persisted) {
      sync();
      return;
    }

    stop();
    section.removeEventListener("pointerenter", onEnter);
    section.removeEventListener("pointermove", onMove);
    section.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("scroll", invalidate, true);
    window.removeEventListener("resize", invalidate);
    document.removeEventListener("visibilitychange", onVisibility);
    reducedMotion.removeEventListener("change", onModeChange);
    coarsePointer.removeEventListener("change", onModeChange);

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    cardBoxes = [];
    glow.remove();
  };

  section.addEventListener("pointerenter", onEnter);
  section.addEventListener("pointermove", onMove, { passive: true });
  section.addEventListener("pointerleave", onLeave);
  window.addEventListener("scroll", invalidate, { passive: true, capture: true });
  window.addEventListener("resize", invalidate, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  reducedMotion.addEventListener("change", onModeChange);
  coarsePointer.addEventListener("change", onModeChange);
  window.addEventListener("pagehide", teardown);

  /* Tab swaps hide panels; re-measure so the idle position tracks the new
     featured card without interrupting a follow in progress. */
  if (window.MutationObserver) {
    observer = new window.MutationObserver(() => {
      if (dirty) {
        return;
      }

      measure();
    });

    observer.observe(section, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
  }

  sync();
})();
