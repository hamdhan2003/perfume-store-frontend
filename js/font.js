// assets/js/font.js
(function () {
    const FONT_SCALE = {
      base: "16px",
  
      h1: "3.5rem",   // Hero / Page titles
      h2: "2.5rem",
      h3: "1.875rem",
      h4: "1.5rem",
      h5: "1.25rem",
  
      body: "1rem",   // Paragraphs
      small: "0.875rem",
  
      button: "0.95rem",
      link: "0.95rem",
      nav: "0.95rem"
    };
  
    const root = document.documentElement;
  
    Object.entries(FONT_SCALE).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value);
    });
  })();