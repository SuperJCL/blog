// The light/dark choice. Without one the site follows the system setting; the header's toggle stores the
// visitor's choice here and sets <html data-theme>, which app/globals.css maps to the light or dark palette.
export const themeKey = "theme";

// Runs in <head> before the page paints, so a remembered dark choice never flashes light first.
export const themeScript = `try{var t=localStorage.getItem("${themeKey}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
