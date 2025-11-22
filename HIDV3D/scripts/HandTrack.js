// Hand tracking variables
let handModel = null;
let handTrackingActive = false;
let webcam = null;
let handStatus = null;

// Initialize hand tracking
async function initHandTracking() {
  if (!handTrackingActive) return;
  
  try {
    // Load the hand tracking model
    handModel = await handTrack.load();
    webcam = document.getElementById('webcam');
    handStatus = document.getElementById('handStatus');
    
    // Start webcam stream
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    });
    webcam.srcObject = stream;

    // Wait for the video element to be ready before detecting hands
    webcam.onloadeddata = function() {
        detectHands();
    };

    
    // Start detection loop
    detectHands();
  } catch (error) {
    console.error('Hand tracking initialization failed:', error);
    handStatus.textContent = 'Hand tracking failed to start';
  }
}

// Detect hands in video stream
async function detectHands() {
  if (!handTrackingActive || !handModel || !webcam) return;
  
  try {
    const predictions = await handModel.detect(webcam);
    
    // Clear previous status
    handStatus.textContent = '';
    
    // Process predictions
    if (predictions.length > 0) {
      const hand = predictions[0];
      const { bbox, label } = hand;
      
      // Draw bounding box (optional)
      // You can add canvas drawing here if needed
      
      // Simple gesture detection logic
      const [x, y, width, height] = bbox;
      const aspectRatio = width / height;
      
      // Detect thumbs up/down based on hand position and aspect ratio
      if (aspectRatio > 1.2) {
        // Wide hand (thumbs up)
        handStatus.textContent = '👍 Thumbs Up Detected!';
        // Add your visualization control logic here
        // For example: viewer.autoRotate(true);
      } else if (aspectRatio < 0.8) {
        // Tall hand (thumbs down)
        handStatus.textContent = '👎 Thumbs Down Detected!';
        // Add your visualization control logic here
        // For example: viewer.autoRotate(false);
      } else {
        handStatus.textContent = 'Hand detected';
      }
    } else {
      handStatus.textContent = 'No hand detected';
    }
    
    // Continue detection loop
    requestAnimationFrame(detectHands);
  } catch (error) {
    console.error('Hand detection error:', error);
    handStatus.textContent = 'Detection error';
  }
}

// Toggle hand tracking
document.getElementById('handControlBtn').addEventListener('click', async function() {
  handTrackingActive = !handTrackingActive;
  const panel = document.getElementById('handControlPanel');
  
  if (handTrackingActive) {
    panel.style.display = 'block';
    await initHandTracking();
    this.textContent = '🖐️ Stop Hand Control';
  } else {
    panel.style.display = 'none';
    this.textContent = '🖐️ Hand Control';
    
    // Clean up resources
    if (handModel) {
      handModel.dispose();
      handModel = null;
    }
    if (webcam && webcam.srcObject) {
      const tracks = webcam.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      webcam.srcObject = null;
    }
  }
});
