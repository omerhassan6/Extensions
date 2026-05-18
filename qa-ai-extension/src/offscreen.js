// Offscreen document — owns the actual MediaRecorder + tab MediaStream.
// Receives commands from background.js and reports state back.

let mediaRecorder = null;
let stream = null;
let chunks = [];
let recordingStartedAt = 0;
let finalBlobUrl = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;

  if (msg.type === 'start-recording') {
    startRecording(msg.streamId)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'stop-recording') {
    stopRecording()
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'get-last-recording') {
    sendResponse({ ok: true, url: finalBlobUrl });
    return false;
  }
});

async function startRecording(streamId) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    throw new Error('Already recording');
  }

  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        maxFrameRate: 30
      }
    }
  });

  // Pipe captured tab audio back to the speakers so the user still hears it.
  const audioCtx = new AudioContext();
  const src = audioCtx.createMediaStreamSource(stream);
  src.connect(audioCtx.destination);

  chunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  mediaRecorder.start(1000);
  recordingStartedAt = Date.now();
}

async function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    throw new Error('No recording in progress');
  }

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: 'video/webm' });

        // Stop all underlying tracks.
        stream.getTracks().forEach(t => t.stop());

        // Convert to base64 data URL so background/popup can hand it back as JSON.
        const dataUrl = await blobToDataURL(blob);

        // Also grab a still frame as a screenshot fallback.
        const thumbnail = await firstFrameThumbnail(blob);

        finalBlobUrl = URL.createObjectURL(blob);
        const duration = (Date.now() - recordingStartedAt) / 1000;

        chunks = [];
        mediaRecorder = null;
        stream = null;

        resolve({
          dataUrl,
          thumbnail,
          duration,
          size: blob.size,
          mimeType: 'video/webm'
        });
      } catch (e) {
        reject(e);
      }
    };
    mediaRecorder.stop();
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function firstFrameThumbnail(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('loadeddata', () => {
      // Seek to ~1s to skip the first black frame.
      const t = Math.min(1, (video.duration || 1) * 0.1);
      video.currentTime = t;
    }, { once: true });
    video.addEventListener('seeked', () => {
      const c = document.createElement('canvas');
      c.width = video.videoWidth || 1280;
      c.height = video.videoHeight || 720;
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    }, { once: true });
    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, { once: true });
  });
}
