let opener: (() => void) | null = null;

export function registerChangelogModalOpener(fn: (() => void) | null) {
  opener = fn;
}

export function openChangelogModal() {
  if (opener) {
    opener();
  }
}
