

function handAngles(date) {
  const seconds = date.getSeconds() + date.getMilliseconds() / 1000;
  const minutes = date.getMinutes() + seconds / 60;
  return { hour: (date.getHours() % 12 + minutes / 60) * 30, minute: minutes * 6, second: seconds * 6 };
}

function clockTime(now, demoElapsedMs = null) {
  return demoElapsedMs === null ? new Date(now) : new Date(new Date(2000, 0, 1, 10, 10).getTime() + demoElapsedMs * 60);
}

function startClock() {
  const clock = document.getElementById('clock');
  const dial = document.getElementById('ticks');
  const digital = document.getElementById('digital');
  const modeLabel = document.getElementById('mode-label');
  const dateLabel = document.getElementById('date-label');
  const liveButton = document.getElementById('live');
  const demoButton = document.getElementById('demo');
  const motionButton = document.getElementById('motion');
  const fullButton = document.getElementById('fullscreen');
  const videoStatus = document.getElementById('video-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hands = Object.fromEntries(['hour', 'minute', 'second'].map(name => [name, document.getElementById(name)]));
  const firstVideo = document.getElementById('painter');
  const secondVideo = firstVideo.cloneNode(true);
  secondVideo.id = 'painter-overlap';
  secondVideo.style.opacity = '0';
  firstVideo.after(secondVideo);
  const videos = [firstVideo, secondVideo];
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'long' });
  let demoStart = null;
  let pausedByUser = false;
  let blocked = false;
  let filmError = false;
  let active = 0;
  let blending = false;
  let timer;
  let lastText = '';
  let shownTime;
  let angles;
  const overlap = 0.7;

  for (let i = 0; i < 60; i++) {
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const major = i % 5 === 0;
    for (const [key, value] of Object.entries({ x1: 300, x2: 300, y1: 30, y2: major ? 48 : 38, transform: `rotate(${i * 6} 300 300)` })) {
      tick.setAttribute(key, String(value));
    }
    if (major) tick.classList.add('major');
    dial.append(tick);
  }

  function mayPlay() {
    return !reduced.matches && !pausedByUser && !document.hidden && !blocked && !filmError;
  }

  function mediaUI() {
    const video = videos[active];
    const state = filmError ? 'error' : reduced.matches ? 'reduced' : blocked ? 'blocked' : pausedByUser ? 'paused' : document.hidden ? 'hidden' : video.readyState < 2 ? 'loading' : video.paused ? 'ready' : 'playing';
    const messages = { error: 'Film unavailable · clock still live', reduced: 'Still frame · reduced motion', blocked: 'Autoplay paused · select Play film', paused: 'Film paused · hands keep time', hidden: 'Film resting while tab is hidden', loading: 'Loading painter film…', ready: 'Painter film ready', playing: 'AI painter film · 8-second study' };
    clock.dataset.videoState = state;
    clock.dataset.reducedMotion = String(reduced.matches);
    videoStatus.textContent = messages[state];
    motionButton.disabled = reduced.matches || filmError;
    motionButton.textContent = reduced.matches ? 'Motion reduced' : filmError ? 'Film unavailable' : pausedByUser || blocked ? 'Play film' : 'Pause film';
  }

  function cancelBlend() {
    blending = false;
    videos[1 - active].pause();
    videos[1 - active].style.opacity = '0';
    videos[active].style.opacity = '1';
  }

  async function playVideo(video) {
    try {
      await video.play();
      if (!mayPlay()) video.pause();
    } catch (error) {
      if (error.name !== 'AbortError' && mayPlay()) {
        blocked = true;
        cancelBlend();
        videos.forEach(item => item.pause());
      }
    }
    mediaUI();
  }

  function syncPlayback() {
    if (mayPlay()) playVideo(videos[active]);
    else {
      cancelBlend();
      videos.forEach(video => video.pause());
    }
    mediaUI();
  }

  function blendFilm() {
    if (!mayPlay()) return;
    const outgoing = videos[active];
    const incoming = videos[1 - active];
    if (!blending && outgoing.duration - outgoing.currentTime <= overlap && incoming.readyState >= 2) {
      incoming.currentTime = 0;
      incoming.style.zIndex = '2';
      outgoing.style.zIndex = '1';
      blending = true;
      playVideo(incoming);
    }
    if (!blending) return;
    const progress = Math.min(1, incoming.currentTime / overlap);
    incoming.style.opacity = String(progress);
    if (progress >= 1) {
      outgoing.pause();
      outgoing.style.opacity = '0';
      active = 1 - active;
      blending = false;
    }
  }

  function render() {
    shownTime = clockTime(new Date(), demoStart === null ? null : performance.now() - demoStart);
    angles = handAngles(shownTime);
    for (const name of Object.keys(hands)) hands[name].setAttribute('transform', `rotate(${angles[name]} 300 300)`);
    const text = timeFormat.format(shownTime);
    if (lastText !== text) {
      digital.textContent = text;
      digital.dateTime = shownTime.toISOString();
      digital.setAttribute('aria-label', `${demoStart === null ? 'Local time' : 'Demo time'} ${text}`);
      dateLabel.textContent = demoStart === null ? dateFormat.format(shownTime) : 'Accelerated study · not the current time';
      lastText = text;
    }
    blendFilm();
  }

  function tick() {
    render();
    timer = reduced.matches ? setTimeout(tick, 1000) : requestAnimationFrame(tick);
  }

  function restart() {
    cancelAnimationFrame(timer);
    clearTimeout(timer);
    syncPlayback();
    if (document.hidden) render();
    else tick();
  }

  function setMode(mode) {
    demoStart = mode === 'demo' ? performance.now() : null;
    clock.dataset.mode = mode;
    modeLabel.textContent = mode === 'demo' ? 'Demo · 60× speed' : 'Live · local time';
    liveButton.setAttribute('aria-pressed', String(mode === 'live'));
    demoButton.setAttribute('aria-pressed', String(mode === 'demo'));
    lastText = '';
    render();
  }

  liveButton.addEventListener('click', () => setMode('live'));
  demoButton.addEventListener('click', () => setMode('demo'));
  motionButton.addEventListener('click', () => {
    pausedByUser = blocked ? false : !pausedByUser;
    blocked = false;
    syncPlayback();
  });
  videos.forEach(video => {
    video.muted = true;
    for (const event of ['loadeddata', 'playing', 'pause', 'waiting']) video.addEventListener(event, mediaUI);
    video.addEventListener('error', () => { filmError = true; syncPlayback(); });
  });
  fullButton.hidden = !document.fullscreenEnabled;
  fullButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      videoStatus.textContent = 'Fullscreen unavailable in this browser.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullButton.textContent = document.fullscreenElement ? '⛶ Exit fullscreen' : '⛶ Fullscreen';
  });
  document.addEventListener('visibilitychange', restart);
  window.addEventListener('pageshow', restart);
  reduced.addEventListener('change', restart);
  document.getElementById('zone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ');
  window.clock = Object.freeze({
    snapshot: () => ({
      mode: clock.dataset.mode, time: shownTime.toISOString(), angles: { ...angles },
      reducedMotion: reduced.matches, videoState: clock.dataset.videoState, blending,
      videos: videos.map(video => ({ readyState: video.readyState, time: video.currentTime, paused: video.paused,
        width: video.videoWidth, height: video.videoHeight, src: video.currentSrc, opacity: Number(getComputedStyle(video).opacity) }))
    })
  });
  restart();
}

if (typeof module !== 'undefined' && module.exports) module.exports = { handAngles, clockTime };
if (typeof document !== 'undefined') startClock();
