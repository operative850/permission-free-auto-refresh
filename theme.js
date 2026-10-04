// Loaded in <head> so the saved theme applies before the popup paints.
// Dark is the default. localStorage works in extension pages with no permission.
try {
  if (localStorage.getItem("theme") === "light") {
    document.documentElement.dataset.theme = "light";
  }
} catch (e) {}
