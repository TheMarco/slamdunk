let performanceProfile = null;

export function getPerformanceProfile() {
  if (performanceProfile !== null) return performanceProfile;

  const urlParams = new URLSearchParams(window.location.search);
  const override = urlParams.get('q');
  if (override && ['high', 'medium', 'low'].includes(override)) {
    performanceProfile = override;
    return performanceProfile;
  }

  let profile = 'high';
  const mobile = isMobile();

  if (mobile) {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4;

    if (cores < 4 || memory < 3) profile = 'medium';
    if (cores < 2 || memory < 2) profile = 'low';
  }

  performanceProfile = profile;
  return profile;
}

export function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function isDesktop() {
  return !isMobile();
}
