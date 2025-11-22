// Hand Gesture Recognition: Open and Closed Hand using Handpose & Fingerpose
let handposeModel, handGestureEstimator, gesturePanelActive = false;

// Emoji mapping
const gestureEmojis = {
    hand_open: '🖐️',
    hand_closed: '✊',
};

// Open hand: All fingers straight
function createHandOpenGesture() {
    const fp = window.fp;
    const handOpen = new fp.GestureDescription('hand_open');
    for (let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
        handOpen.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
        handOpen.addCurl(finger, fp.FingerCurl.HalfCurl, 0.1); // allow a little curl
    }
    return handOpen;
}

// Closed hand (fist): All fingers curled
function createHandClosedGesture() {
    const fp = window.fp;
    const handClosed = new fp.GestureDescription('hand_closed');
    for (let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
        handClosed.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
        handClosed.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
    }
    return handClosed;
}

// Setup handpose/fingerpose and register gestures
async function setupHandpose() {
    const spinner = document.getElementById('handLoading');
    if (!handposeModel) {
        if (spinner) spinner.style.display = 'block';
        handposeModel = await handpose.load();
        if (spinner) spinner.style.display = 'none';
    }
    if (!handGestureEstimator) {
        handGestureEstimator = new fp.GestureEstimator([
            createHandOpenGesture(),
            createHandClosedGesture(),
        ]);
    }
}

// Detect and draw gestures
async function runGestureDetection() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('gestureCanvas');
    const gestureStatus = document.getElementById('gestureStatus');
    const ctx = canvas.getContext('2d');

    if (!gesturePanelActive) return;

    if (video.readyState < 2) {
        requestAnimationFrame(runGestureDetection);
        return;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const predictions = await handposeModel.estimateHands(video);
    if (predictions.length > 0) {
        const keypoints = predictions[0].landmarks;
        ctx.fillStyle = '#32b8c6';
        for (let i = 0; i < keypoints.length; i++) {
            const [x, y] = keypoints[i];
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lower threshold for better detection
        const { gestures } = handGestureEstimator.estimate(keypoints, 5.0);
        if (gestures && gestures.length > 0) {
            let best = gestures.reduce((a, b) => (a.score > b.score ? a : b));
            if (best.score > 5.0 && gestureEmojis[best.name]) {
                gestureStatus.textContent = gestureEmojis[best.name];
                // Control visualization
                if (window.viewer && window.viewer.controls) {
                    if (best.name === 'hand_open') {
                        window.viewer.controls.autoRotate = true;
                        window.viewer.controls.autoRotateSpeed = 2.0;
                    }
                    if (best.name === 'hand_closed') {
                        window.viewer.controls.autoRotate = false;
                    }
                }
            } else {
                gestureStatus.textContent = '';
            }
        } else {
            gestureStatus.textContent = '';
        }
    } else {
        gestureStatus.textContent = '';
    }
    ctx.restore();

    requestAnimationFrame(runGestureDetection);
}

// Toggle hand gesture panel and webcam
document.getElementById('handControlBtn').addEventListener('click', async function() {
    const panel = document.getElementById('handGesturePanel');
    gesturePanelActive = !gesturePanelActive;

    if (gesturePanelActive) {
        this.textContent = '🛑 Stop Hand Control';
        panel.style.display = 'block';

        const video = document.getElementById('webcam');
        if (!video.srcObject) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                await new Promise((resolve) => { video.onloadedmetadata = resolve; });
                video.play();
            } catch (error) {
                alert('Camera access denied. Please allow camera permissions.');
                gesturePanelActive = false;
                this.textContent = '🖐️ Hand Control';
                panel.style.display = 'none';
                return;
            }
        }

        await setupHandpose();
        runGestureDetection();
    } else {
        this.textContent = '🖐️ Hand Control';
        panel.style.display = 'none';

        const video = document.getElementById('webcam');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
        }
        document.getElementById('gestureStatus').textContent = '';
        const canvas = document.getElementById('gestureCanvas');
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        // Always stop auto-rotation when hand gesture is off
        if (window.viewer && window.viewer.controls) {
            window.viewer.controls.autoRotate = false;
        }
    }
});
