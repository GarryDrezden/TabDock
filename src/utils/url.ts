const UNSAVABLE_PROTOCOLS = new Set([
  "chrome:",
  "chrome-extension:",
  "chrome-search:",
  "chrome-untrusted:",
  "edge:",
  "about:",
  "devtools:",
  "view-source:",
  "data:",
  "blob:",
  "file:",
]);

export function isSavableUrl(url: string | undefined): url is string {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (UNSAVABLE_PROTOCOLS.has(parsed.protocol)) {
      return false;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function urlsMatch(left: string, right: string): boolean {
  return left === right;
}

export function compactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.host}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

export function hostnameLetter(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const letter = host.charAt(0).toUpperCase();
    return letter || "?";
  } catch {
    return "?";
  }
}
